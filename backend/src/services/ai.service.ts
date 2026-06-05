import OpenAI from "openai";
import { Groq } from "groq-sdk";
import mongoose from "mongoose";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { pipeline } from "@xenova/transformers";
import { getGroqApiKey } from "../config.js";
import { ContentModel, BrainInsightModel, UserModel } from "../db.js";
import { buildDeterministicDescription, deriveCategory, deriveDeterministicTags, deriveTopics, shouldUseAiSynthesis, toBackendType, truncateForSynthesis } from "./ingestion/classification.js";
import { extractContentFromUrl } from "./ingestion/registry.js";
import type { ClassificationMode, ExtractedContent, IngestionStatus } from "./ingestion/types.js";
import { withDistributedLock } from "../queue/lock.js";

// --- Local Brain Engine (Zero-Cost Singleton) ---
let extractorPromise: Promise<any> | null = null;
const getExtractor = async () => {
    if (!extractorPromise) {
        console.log("[AI][LOCAL_MODEL_LOAD] Initializing MiniLM-L6-v2...");
        extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2').then(model => {
            console.log("[AI][LOCAL_MODEL_LOAD] Ready.");
            return model;
        }).catch(err => {
            console.error("[AI][LOCAL_MODEL_LOAD] Failed:", err.message);
            extractorPromise = null;
            throw err;
        });
    }
    return extractorPromise;
};

// @ts-ignore
puppeteer.use(StealthPlugin());

// --- Reliability Engine (Production Errors & Metrics) ---
// ... (existing code)

/**
 * Deep Scraper Engine (Puppeteer + Stealth)
 * Launches a real headless browser to bypass React/Notion security walls.
 */
const deepScrape = async (url: string): Promise<string> => {
  console.log(`[AI][DEEP_SCRAPE_START] ${url}`);
  let browser;
  try {
    // @ts-ignore
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--blink-settings=imagesEnabled=false' 
      ],
    });
    const page = await browser.newPage();
    
    // SPEED BOOSTER: Block stylesheets and fonts
    await page.setRequestInterception(true);
    page.on('request', (req: any) => {
      if (['stylesheet', 'font', 'media', 'image'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    const isSlowSite = url.includes('notion.so') || url.includes('app.notion.com') || url.includes('linkedin.com');
    await new Promise(r => setTimeout(r, isSlowSite ? 3000 : 800));

    // Robust Extraction: Try direct, fallback to content
    let content = "";
    try {
      content = await page.evaluate(() => {
        const body = document.querySelector('body');
        if (!body) return "";
        // Remove noise
        const scripts = body.querySelectorAll('script, style, nav, footer, noscript');
        scripts.forEach(s => s.remove());
        return body.innerText;
      });
    } catch (evalErr) {
      console.warn("[AI][DEEP_SCRAPE][EVAL_RETRY] Frame detached. Using content fallback.");
      const rawHtml = await page.content();
      content = rawHtml.replace(/<[^>]*>?/gm, ' ').slice(0, 15000); // Crude but safe text extraction
    }

    console.log(`[AI][DEEP_SCRAPE_OK] chars=${content?.length ?? 0}`);
    return (content || "").slice(0, 10000); 
  } catch (error: any) {
    console.error(`[AI][DEEP_SCRAPE_FAILED] ${error.message}`);
    return "";
  } finally {
    if (browser) await browser.close();
  }
};

export enum AIErrorCode {
  RATE_LIMIT = "AI_RATE_LIMIT",
  CONTEXT_FAILURE = "AI_CONTEXT_FAILURE",
  SYNTHESIS_ERROR = "AI_SYNTHESIS_ERROR",
  EMBEDDING_FAILURE = "AI_EMBEDDING_FAILURE",
  TIMEOUT = "AI_TIMEOUT"
}

export class AIError extends Error {
  constructor(public code: AIErrorCode, message: string, public retryable: boolean = true) {
    super(message);
    this.name = "AIError";
  }
}

export const aiMetrics = {
  totalRequests: 0,
  failedRequests: 0,
  totalTokens: 0,
  avgLatency: 0,
  lastError: null as string | null
};

const updateMetrics = (latency: number, tokens: number = 0, error: string | null = null) => {
  aiMetrics.totalRequests++;
  if (error) {
    aiMetrics.failedRequests++;
    aiMetrics.lastError = error;
  }
  aiMetrics.totalTokens += tokens;
  aiMetrics.avgLatency = (aiMetrics.avgLatency * (aiMetrics.totalRequests - 1) + latency) / aiMetrics.totalRequests;
};

// --- Provider Initialization ---
const isValidKey = (key?: string) => !!key && !key.includes("****") && key.length > 20;

const groq = isValidKey(process.env.GROQ_API_KEY) ? new Groq({
  apiKey: process.env.GROQ_API_KEY,
}) : null;

const openai = isValidKey(process.env.OPENAI_API_KEY) ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 15000 
}) : null;

const LLM_TIMEOUT_MS = 20000; // 20s hard limit per attempt

/**
 * Wraps a promise with a hard timeout.
 */
const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new AIError(AIErrorCode.TIMEOUT, `[TIMEOUT] ${label} exceeded ${ms}ms`, true)), ms)
  );
  return Promise.race([promise, timeout]);
};

/**
 * Sanitizes provider errors so raw API messages never reach the controller layer.
 */
const sanitizeError = (err: any): string => {
  if (err instanceof AIError) return err.code;
  // Strip any API key fragments or raw provider messages
  return "LLM_PROVIDER_ERROR";
};

/**
 * Robust LLM Invoker (Multi-Provider, Timeout + Exponential Backoff)
 */
const invokeLLM = async (params: any, retries = 2) => {
  const start = Date.now();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      let callPromise: Promise<any>;

      if (openai) {
        callPromise = openai.chat.completions.create({
          ...params,
          model: params.model === "llama-3.3-70b-versatile" ? "gpt-4o-mini" : params.model
        });
      } else if (groq) {
        callPromise = groq.chat.completions.create(params);
      } else {
        throw new AIError(AIErrorCode.SYNTHESIS_ERROR, "No AI provider configured", false);
      }

      const response = await withTimeout(callPromise, LLM_TIMEOUT_MS, `invokeLLM attempt ${attempt + 1}`);
      updateMetrics(Date.now() - start, response.usage?.total_tokens || 0);
      console.log(`[LLM_OK] attempt=${attempt + 1} latency=${Date.now() - start}ms tokens=${response.usage?.total_tokens ?? 0}`);
      return response;

    } catch (err: any) {
      const isRateLimit = err.status === 429 || err.message?.includes("rate limit");
      const isTimeout   = err.code === AIErrorCode.TIMEOUT;
      const isRetryable = (isRateLimit || isTimeout || err.status >= 500) && attempt < retries;

      console.error(`[LLM_ATTEMPT_FAILED] attempt=${attempt + 1}/${retries + 1} code=${sanitizeError(err)}`);

      if (!isRetryable || attempt === retries) {
        updateMetrics(Date.now() - start, 0, sanitizeError(err));
        throw new AIError(
          isRateLimit ? AIErrorCode.RATE_LIMIT : isTimeout ? AIErrorCode.TIMEOUT : AIErrorCode.SYNTHESIS_ERROR,
          sanitizeError(err),
          isRetryable
        );
      }

      const delay = Math.min(Math.pow(2, attempt) * 1000 + Math.random() * 500, 8000);
      console.log(`[LLM_RETRY] waiting ${Math.round(delay)}ms before attempt ${attempt + 2}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new AIError(AIErrorCode.TIMEOUT, "LLM_MAX_RETRIES_EXCEEDED", true);
};

interface AiMetadataSnapshot {
  domain?: string | undefined;
  source?: string | undefined;
  contentType?: string | undefined;
  estimatedTopics?: string[] | undefined;
  normalizedLink?: string | undefined;
  platform?: string | undefined;
  extractionSource?: string | undefined;
  extractionConfidence?: number | undefined;
  validationPassed?: boolean | undefined;
  cacheEligible?: boolean | undefined;
  transcriptAvailable?: boolean | undefined;
  author?: string | undefined;
  channel?: string | undefined;
  durationSeconds?: number | undefined;
  sourceType?: string | undefined;
  extractionQuality?: string | undefined;
  extractionWordCount?: number | undefined;
  ingestionStatus?: IngestionStatus;
  ingestionReason?: string | undefined;
  summarizationSkipped?: boolean | undefined;
  acquisitionMethod?: string | undefined;
  accessRequirement?: "public" | "authenticated" | undefined;
}

export interface AiClassification {
  title: string;
  description: string;
  type: "post" | "video" | "document";
  tags: string[];
  topics: string[];
  normalizedLink?: string;
  ingestionStatus?: IngestionStatus;
  ingestionReason?: string | undefined;
  aiMetadata?: AiMetadataSnapshot;
}

const trimTag = (tag: string) => tag.trim().toLowerCase().replace(/[^a-z0-9+#.\-_ ]+/g, " ").replace(/\s+/g, "-");

const normalizeTags = (tags: unknown) =>
  Array.isArray(tags)
    ? Array.from(
        new Set(
          tags
            .map((tag) => trimTag(String(tag || "")))
            .filter(Boolean)
            .slice(0, 8)
        )
      )
    : [];

const parseJsonObject = (content: string) => {
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
};

const buildAiMetadata = (
  normalizedUrl: string,
  extraction: ExtractedContent,
  topics: string[],
  options?: { ingestionStatus?: IngestionStatus; ingestionReason?: string | undefined; summarizationSkipped?: boolean }
): AiMetadataSnapshot => {
  const domain = new URL(normalizedUrl).hostname.replace(/^www\./, "");
  const cacheEligible = extraction.cacheable && extraction.validation.passed && extraction.confidence >= 0.7;

  return {
    domain,
    source: domain,
    contentType: extraction.contentType,
    estimatedTopics: topics,
    normalizedLink: normalizedUrl,
    platform: extraction.platform,
    extractionSource: extraction.source,
    extractionConfidence: extraction.confidence,
    validationPassed: extraction.validation.passed,
    cacheEligible,
    transcriptAvailable: extraction.source === "youtube-transcript",
    author: extraction.metadata.author,
    channel: extraction.metadata.channel,
    durationSeconds: extraction.metadata.durationSeconds,
    sourceType: extraction.sourceType,
    extractionQuality: extraction.extractionQuality,
    extractionWordCount: extraction.wordCount,
    ingestionStatus: options?.ingestionStatus || extraction.ingestionStatus,
    ingestionReason: options?.ingestionReason,
    summarizationSkipped: options?.summarizationSkipped,
    acquisitionMethod: extraction.acquisitionMethod,
    accessRequirement: extraction.sourceType === "protected_source" ? "authenticated" : "public",
  };
};

const buildSynthesisDescription = (
  result: Record<string, any>,
  deterministicDescription: string
) => {
  const shortDescription = String(result.short_description || "").trim() || deterministicDescription.split("\n\n")[0] || "No summary available.";
  const summaryPoints = Array.isArray(result.summary_points)
    ? result.summary_points.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 4)
    : [];
  const semanticSummary = Array.isArray(result.semantic_summary)
    ? result.semantic_summary.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 3)
    : [];

  const sections = [shortDescription];
  if (summaryPoints.length > 0) {
    sections.push(`MAIN IDEAS:\n${summaryPoints.map((item) => `• ${item}`).join("\n")}`);
  }
  if (semanticSummary.length > 0) {
    sections.push(`KEY TAKEAWAYS:\n${semanticSummary.map((item) => `• ${item}`).join("\n")}`);
  }

  return sections.join("\n\n").trim();
};

const buildFallbackClassification = (normalizedUrl: string, extraction: ExtractedContent): AiClassification => {
  const tags = deriveDeterministicTags(extraction);
  const category = deriveCategory(extraction);
  const topics = deriveTopics(tags, category);
  const description = buildDeterministicDescription(extraction);

  return {
    title: extraction.metadata.title || "New Content",
    description:
      extraction.ingestionStatus === "metadata_only"
        ? `Based on the source metadata, ${description.charAt(0).toLowerCase()}${description.slice(1)}`
        : description,
    type: toBackendType(extraction.contentType),
    tags,
    topics,
    ingestionStatus: extraction.ingestionStatus,
    ingestionReason: extraction.ingestionReason,
    normalizedLink: normalizedUrl,
    aiMetadata: buildAiMetadata(normalizedUrl, extraction, topics, {
      ingestionStatus: extraction.ingestionStatus,
      ingestionReason: extraction.ingestionReason,
      summarizationSkipped: true,
    }),
  };
};

const buildUnavailableClassification = (
  normalizedUrl: string,
  extraction: ExtractedContent,
  status: IngestionStatus,
  reason?: string
): AiClassification => {
  const tags = deriveDeterministicTags(extraction);
  const category =
    status === "authentication_required"
      ? "Authentication Required"
      : status === "unsupported"
        ? "Unsupported Source"
        : "Extraction Failed";
  const topics = deriveTopics(tags, category);
  const description =
    extraction.metadata.description ||
    (status === "authentication_required"
      ? "Unable to access content automatically. Connect the relevant account or sign in to the source, then retry."
      : status === "unsupported"
        ? "This source was identified, but the current pipeline does not yet support extracting its content automatically."
        : "Automatic extraction could not retrieve enough reliable content to generate insights.");

  return {
    title:
      extraction.metadata.title ||
      (status === "authentication_required"
        ? "Authentication required"
        : status === "unsupported"
          ? "Unsupported source"
          : "Extraction failed"),
    description,
    type: toBackendType(extraction.contentType),
    tags,
    topics,
    ingestionStatus: status,
    ingestionReason: reason,
    normalizedLink: normalizedUrl,
    aiMetadata: buildAiMetadata(normalizedUrl, extraction, topics, {
      ingestionStatus: status,
      ingestionReason: reason,
      summarizationSkipped: true,
    }),
  };
};

const GOOGLE_STALE_SUMMARY_MARKERS = [
  "google docs: sign-in",
  "access google docs with a personal google account",
  "access google docs with a google workspace account",
  "to continue to google docs",
  "use guest mode to sign in privately",
  "email or phone",
  "forgot email",
];

const INGESTION_STATUS_PRIORITY: Record<IngestionStatus, number> = {
  failed: 0,
  unsupported: 1,
  authentication_required: 2,
  metadata_only: 3,
  partial_extraction: 4,
  full_extraction: 5,
};

const looksLikeStaleGoogleSummary = (doc: any) => {
  if (!doc) return false;

  const normalizedLink = String(doc.normalizedLink || doc.link || "");
  const platform = String(doc.aiMetadata?.platform || "");
  const isGoogleDoc =
    normalizedLink.includes("docs.google.com/document/") ||
    platform === "google";

  if (!isGoogleDoc) return false;

  const haystack = [
    doc.title,
    doc.description,
    doc.aiMetadata?.ingestionReason,
  ]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");

  return GOOGLE_STALE_SUMMARY_MARKERS.some((marker) => haystack.includes(marker));
};

const isReusableCompletedSummary = (doc: any, normalizedLink?: string) => {
  if (!doc) return false;
  if (normalizedLink && doc.normalizedLink !== normalizedLink) return false;
  if (doc.aiStatus !== "completed") return false;
  if (!doc.description) return false;
  if (looksLikeStaleGoogleSummary(doc)) return false;
  if (doc.aiMetadata?.cacheEligible !== true) return false;
  if (doc.aiMetadata?.validationPassed !== true) return false;
  if (Number(doc.aiMetadata?.extractionConfidence || 0) < 0.75) return false;

  if (String(doc.aiMetadata?.platform || "") === "google") {
    return doc.aiMetadata?.ingestionStatus === "full_extraction";
  }

  return true;
};

const shouldPreferNewClassification = (content: any, classification: any) => {
  if (!content?.description) return true;
  if (looksLikeStaleGoogleSummary(content)) return true;

  const previousStatus = (content.aiMetadata?.ingestionStatus || "failed") as IngestionStatus;
  const nextStatus = (classification.ingestionStatus || "failed") as IngestionStatus;
  if ((INGESTION_STATUS_PRIORITY[nextStatus] || 0) > (INGESTION_STATUS_PRIORITY[previousStatus] || 0)) {
    return true;
  }

  const previousConfidence = Number(content.aiMetadata?.extractionConfidence || 0);
  const nextConfidence = Number(classification.aiMetadata?.extractionConfidence || 0);
  return nextConfidence >= previousConfidence;
};

const getBlockedIngestionStatus = (extraction: ExtractedContent, mode: ClassificationMode) => {
  if (mode !== "deep") return null;
  if (["authentication_required", "unsupported", "failed"].includes(extraction.ingestionStatus)) {
    return extraction.ingestionStatus;
  }
  return null;
};

const shouldReuseCachedSummary = (doc: any, normalizedLink: string) =>
  isReusableCompletedSummary(doc, normalizedLink);

/**
 * AI Classification Service
 * Handles metadata extraction and content categorization.
 * Supports 'quick' (latency-optimized) and 'deep' (insight-optimized) modes.
 */
import type { ExtractContext } from "./ingestion/types.js";

export const getAiClassification = async (
  url: string,
  mode: ClassificationMode = "deep",
  context?: ExtractContext
): Promise<AiClassification> => {
  const result = await getAiClassificationInternal(url, mode, context);
  if (context?.aiPrefs?.autoTagging === false) {
    result.tags = [];
  }
  return result;
};

const getAiClassificationInternal = async (url: string, mode: ClassificationMode = "deep", context?: ExtractContext): Promise<AiClassification> => {
  try {
    const { target, extraction } = await extractContentFromUrl(url, mode, context);
    const blockedStatus = getBlockedIngestionStatus(extraction, mode);
    const shouldSkipSummarization = Boolean(blockedStatus);

    console.log("[INGESTION_METRICS]", {
      normalizedUrl: target.normalizedUrl,
      platform: extraction.platform,
      source: extraction.source,
      sourceType: extraction.sourceType,
      ingestionStatus: extraction.ingestionStatus,
      confidence: extraction.confidence,
      wordCount: extraction.wordCount,
      extractionQuality: extraction.extractionQuality,
      validationPassed: extraction.validation.passed,
      summarizationSkipped: shouldSkipSummarization,
      skipReason: extraction.ingestionReason || blockedStatus,
    });

    if (mode === "deep") {
      const existing = await ContentModel.findOne({
        normalizedLink: target.normalizedUrl,
        aiStatus: "completed",
        "aiMetadata.cacheEligible": true,
        "aiMetadata.validationPassed": true,
        "aiMetadata.extractionConfidence": { $gte: 0.75 },
      }).sort({ "aiMetadata.extractionConfidence": -1, createdAt: -1 });

      if (shouldReuseCachedSummary(existing, target.normalizedUrl)) {
        const cached = existing!;
        console.log(`[AI_CACHE_HIT]: ${target.normalizedUrl}`);
        return {
          title: cached.title,
          description: cached.description,
          tags: cached.tags,
          topics: cached.topics,
          type: cached.type,
          normalizedLink: cached.normalizedLink || target.normalizedUrl,
          ingestionStatus: cached.aiMetadata?.ingestionStatus,
          ingestionReason: cached.aiMetadata?.ingestionReason,
          aiMetadata: cached.aiMetadata,
        };
      }
    }

    const fallbackClassification = buildFallbackClassification(target.normalizedUrl, extraction);
    const blockedFallback = blockedStatus
      ? buildUnavailableClassification(
          target.normalizedUrl,
          extraction,
          blockedStatus,
          extraction.ingestionReason || blockedStatus
        )
      : null;

    if (blockedFallback) {
      return blockedFallback;
    }

    if (!shouldUseAiSynthesis(extraction, mode) || (!openai && !groq)) {
      return fallbackClassification;
    }

    const sourceCoverageNote =
      extraction.ingestionStatus === "full_extraction"
        ? "The extracted content is comprehensive."
        : extraction.ingestionStatus === "partial_extraction"
          ? "The extracted content is partial. Summaries must stay conservative and acknowledge missing detail."
          : "Only source metadata or a limited excerpt was available. Summaries must stay tightly grounded in that limited input.";

    const toneInstruction = context?.aiPrefs?.tone === "Detailed & Academic" 
      ? "Use a highly academic, comprehensive, and analytical tone for the description and summary points." 
      : context?.aiPrefs?.tone === "Creative & Casual" 
        ? "Use a creative, casual, engaging, and conversational tone for the description." 
        : "Use a concise, highly professional, direct, and factual tone.";

    const tagInstruction = context?.aiPrefs?.autoTagging === false
      ? "- tags: [] (Return an empty array for tags as auto-tagging is disabled)."
      : "- tags: 3 to 6 lowercase tags.";

    const synthesisPrompt = `You summarize only verified extracted web content.
Return valid JSON only with:
{
  "title": "",
  "short_description": "",
  "summary_points": [],
  "semantic_summary": [],
  "tags": [],
  "category": "",
  "content_type": ""
}
Rules:
- Use ONLY the provided extracted content and metadata.
- Never infer missing facts.
- Never use general web/domain knowledge.
- If extracted content is insufficient, keep title/description conservative and factual.
- Do not fabricate details, entities, claims, or context.
- Write a short_description that is roughly 6 to 7 sentences long.
- ${toneInstruction}
- summary_points: 2 to 4 concise bullets.
- semantic_summary: 2 to 3 concise insights.
- ${tagInstruction}
- Be literal and deterministic.
- ${sourceCoverageNote}`;

    const response = await invokeLLM({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: synthesisPrompt },
        {
          role: "user",
          content: `URL: ${target.normalizedUrl}
Platform: ${extraction.platform}
Source: ${extraction.source}
Metadata: ${JSON.stringify({
            title: extraction.metadata.title,
            description: extraction.metadata.description,
            author: extraction.metadata.author,
            channel: extraction.metadata.channel,
            tags: extraction.metadata.tags,
          })}
Extracted Content:
${truncateForSynthesis(extraction.content)}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const llmResponse = response.choices[0]?.message?.content || "{}";
    const result = parseJsonObject(llmResponse) as Record<string, any>;
    const tags = normalizeTags(result.tags);
    const finalTags = context?.aiPrefs?.autoTagging === false ? [] : (tags.length > 0 ? tags : fallbackClassification.tags);
    const category = String(result.category || "").trim() || deriveCategory(extraction);
    const topics = deriveTopics(finalTags, category);

    return {
      title: String(result.title || "").trim() || fallbackClassification.title,
      description: buildSynthesisDescription(result, fallbackClassification.description),
      type: fallbackClassification.type,
      tags: finalTags,
      topics,
      ingestionStatus: extraction.ingestionStatus,
      ingestionReason: extraction.ingestionReason,
      normalizedLink: target.normalizedUrl,
      aiMetadata: buildAiMetadata(target.normalizedUrl, extraction, topics, {
        ingestionStatus: extraction.ingestionStatus,
        ingestionReason: extraction.ingestionReason,
      }),
    };

  } catch (error: any) {
    console.error("[AI_CLASSIFICATION_FAILURE]", error.message);
    // Graceful Fallback
    return { 
      title: "New Content", 
      description: "Automatic extraction failed. Manual content is required.",
      type: "post" as const,
      tags: ["extraction-failed"],
      topics: [],
      ingestionStatus: "failed",
      ingestionReason: "classification_failure",
      aiMetadata: {
        extractionSource: "unavailable",
        extractionConfidence: 0.05,
        validationPassed: false,
        cacheEligible: false,
        extractionQuality: "low",
        extractionWordCount: 0,
        ingestionStatus: "failed",
        ingestionReason: "classification_failure",
        summarizationSkipped: true,
        acquisitionMethod: "metadata",
        accessRequirement: "public",
      },
    };
  }
};

/**
 * Robust Embedding Service
 * Uses local extractor for embeddings.
 */
export const createEmbedding = async (text: string, useCache = false): Promise<number[]> => {
  const normalizedText = text.trim().toLowerCase();
  
  // Truncate to safety limits for the model
  const MAX_CHARS = 2000; 
  const safeText = normalizedText.length > MAX_CHARS ? normalizedText.slice(0, MAX_CHARS) : normalizedText;

  // 1. Check Cache
  if (useCache && queryCache.has(safeText)) {
    const cached = queryCache.get(safeText)!;
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.embedding;
    }
    queryCache.delete(safeText);
  }

  try {
    const model = await getExtractor();
    const output = await model(safeText, { pooling: 'mean', normalize: true });
    
    // Convert tensor to regular array
    const embedding = Array.from(output.data) as number[];

    if (useCache) {
      if (queryCache.size >= MAX_CACHE_SIZE) {
        const firstKey = queryCache.keys().next().value;
        if (firstKey) queryCache.delete(firstKey);
      }
      queryCache.set(safeText, { embedding, timestamp: Date.now() });
    }

    return embedding;
  } catch (error: any) {
    console.error("[EMBEDDING_FAILURE]", error.message);
    throw new AIError(AIErrorCode.EMBEDDING_FAILURE, error.message);
  }
};

// --- Service Logic (Retry, Lock, Race Conditions) ---

const queryCache = new Map<string, { embedding: number[], timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000;
const MAX_CACHE_SIZE = 100;
const currentlyProcessing = new Set<string>();
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const processContentEmbedding = async (contentId: string) => {
  if (currentlyProcessing.has(contentId)) return;
  currentlyProcessing.add(contentId);
  
  const MAX_RETRIES = 1;
  const BACKOFF_DELAYS = [800];

  try {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const content = await ContentModel.findById(contentId);
        if (!content || content.embeddingStatus === "completed") break;
        
        let aiPrefs = undefined;
        if (content.userId) {
          const user = await UserModel.findById(content.userId);
          if (user && user.aiPreferences) {
            aiPrefs = user.aiPreferences;
          }
        }

        const normalizedLink = String((content as any).normalizedLink || content.link || "");
        if (!normalizedLink) {
          throw new Error("Missing link for content embedding");
        }

        const duplicateResult = await withDistributedLock(
          `ai:lock:url:${normalizedLink}`,
          120000,
          async () => {
            const reusable = await ContentModel.findOne({
              _id: { $ne: content._id },
              normalizedLink,
              embeddingStatus: "completed",
            }).select("+embedding title description tags topics type aiMetadata normalizedLink");

            if (
              reusable &&
              Array.isArray((reusable as any).embedding) &&
              (reusable as any).embedding.length > 0 &&
              isReusableCompletedSummary(reusable, normalizedLink)
            ) {
              await ContentModel.findByIdAndUpdate(contentId, {
                title: reusable.title,
                description: reusable.description,
                tags: reusable.tags || [],
                topics: reusable.topics || [],
                type: reusable.type || content.type,
                normalizedLink: reusable.normalizedLink || normalizedLink,
                aiMetadata: reusable.aiMetadata || (content as any).aiMetadata,
                embedding: (reusable as any).embedding,
                embeddingStatus: "completed",
                aiStatus: "completed",
                aiProgress: 100,
              });
              console.log(`[AI][DEDUP_REUSE] contentId: ${contentId}`);
              return "reused" as const;
            }

            console.log(`[AI][START] contentId: ${contentId}, attempt: ${attempt + 1}`);

            // 1. SCRAPE & SUMMARIZE (Sequential for stability)
            console.log(`[AI][STEP_1] SCRAPING_START contentId: ${contentId}`);
            await ContentModel.findByIdAndUpdate(contentId, { aiStatus: "scraping", aiProgress: 15 });

            if (/youtube\.com|youtu\.be/.test(normalizedLink)) {
              try {
                const quickClassification = await withTimeout(
                  getAiClassification(content.link!, "quick", {
                    userId: content.userId ? String(content.userId) : undefined,
                    aiPrefs,
                  }),
                  8000,
                  "YouTubeQuickPreview"
                );

                await ContentModel.findByIdAndUpdate(contentId, {
                  title: quickClassification.title || content.title,
                  description: quickClassification.description || content.description,
                  tags: quickClassification.tags || content.tags,
                  topics: quickClassification.topics || content.topics,
                  type: quickClassification.type || content.type,
                  normalizedLink: quickClassification.normalizedLink || normalizedLink,
                  aiMetadata: {
                    ...((content as any).aiMetadata || {}),
                    ...(quickClassification.aiMetadata || {}),
                  },
                  aiStatus: "scraping",
                  aiProgress: 35,
                });
                console.log(`[AI][YOUTUBE_QUICK_PREVIEW] contentId: ${contentId}`);
              } catch (quickError) {
                console.warn(`[AI][YOUTUBE_QUICK_PREVIEW_FAILED] contentId: ${contentId}`, (quickError as Error).message);
              }
            }

            // If link is a Google Docs / Drive link, ensure user's tokens are refreshed and available for extractors.
            try {
              if (content.userId && /docs\.google\.com|drive\.google\.com/.test(normalizedLink)) {
                // Import dynamically to avoid circular imports and keep logic optional
                const { getAccessTokenForUser } = await import("./google.auth.js");
                await getAccessTokenForUser(String(content.userId));
                console.log("[GOOGLE_AUTH] tokens ensured for user (not exposed to logs)");
              }
            } catch (e) {
              console.warn("[GOOGLE_AUTH][ENSURE_FAILED]", (e as Error).message);
            }

            const extractionMode = aiPrefs && aiPrefs.deepExtraction === false ? "quick" : "deep";
            const classification = await withTimeout(
              getAiClassification(content.link!, extractionMode, {
                userId: content.userId ? String(content.userId) : undefined,
                aiPrefs
              }),
              45000,
              "ExtractAndSummarize"
            );

            if (
              classification.ingestionStatus &&
              ["authentication_required", "unsupported", "failed"].includes(classification.ingestionStatus)
            ) {
              await ContentModel.findByIdAndUpdate(contentId, {
                title: classification.title,
                description: classification.description,
                tags: classification.tags,
                topics: classification.topics,
                type: classification.type,
                normalizedLink: classification.normalizedLink || normalizedLink,
                aiMetadata: {
                  ...((content as any).aiMetadata || {}),
                  ...(classification.aiMetadata || {}),
                },
                embeddingStatus: "failed",
                aiStatus: "needs_manual_content",
                aiProgress: 100,
                aiError: classification.ingestionReason || classification.ingestionStatus,
              });
              console.log(`[AI][INGESTION_BLOCKED] contentId: ${contentId} reason=${classification.ingestionReason}`);
              return "manual-required" as const;
            }

            console.log(`[AI][STEP_2] ANALYSIS_OK contentId: ${contentId}`);
            const shouldOverwriteSummary = shouldPreferNewClassification(content, classification);
            const mergedAiMetadata = {
              ...((content as any).aiMetadata || {}),
              ...(classification.aiMetadata || {}),
            };

            await ContentModel.findByIdAndUpdate(contentId, {
              ...(shouldOverwriteSummary ? classification : {}),
              normalizedLink: classification.normalizedLink || (content as any).normalizedLink || content.link,
              aiMetadata: mergedAiMetadata,
              aiStatus: "analyzing",
              aiProgress: 75,
            });

            // 2. EMBED (Based on the new summary)
            console.log(`[AI][STEP_3] EMBEDDING_START contentId: ${contentId}`);
            const effectiveTitle = shouldOverwriteSummary ? classification.title : content.title;
            const effectiveDescription = shouldOverwriteSummary ? classification.description : content.description || classification.description;
            const effectiveTopics = shouldOverwriteSummary ? classification.topics : content.topics || classification.topics;
            const contextText = `Title: ${effectiveTitle}. Description: ${effectiveDescription}. Topics: ${effectiveTopics.join(", ")}`;
            const embedding = await createEmbedding(contextText, false);

            // 3. FINAL SAVE
            console.log(`[AI][STEP_4] FINAL_SAVE contentId: ${contentId}`);
            const updateResult = await ContentModel.updateOne(
              { _id: contentId },
              {
                embedding,
                embeddingStatus: "completed",
                aiStatus: "completed",
                aiProgress: 100,
              }
            );

            if (updateResult.modifiedCount === 0) {
              console.warn(`[AI][RACE_CONDITION] contentId: ${contentId}. Aborting.`);
              return "race-condition" as const;
            }

            console.log(`[AI][SUCCESS] contentId: ${contentId}, attempts: ${attempt + 1}`);
            return "completed" as const;
          }
        );

        if (!duplicateResult.acquired) {
          console.log(`[AI][LOCKED] contentId: ${contentId} already processing.`);
          return;
        }

        if (duplicateResult.value === "completed" || duplicateResult.value === "reused") {
          return;
        }

        console.log(`[AI][START] contentId: ${contentId}, attempt: ${attempt + 1}`);
        if (duplicateResult.value === "race-condition" || duplicateResult.value === "manual-required") {
          break;
        }

      } catch (error) {
        console.error(`[AI][RETRY_ERROR] contentId: ${contentId}, attempt: ${attempt + 1}:`, error);
        if (attempt < MAX_RETRIES) {
          await sleep(BACKOFF_DELAYS[attempt] || 1000);
        } else throw error;
      }
    }
  } catch (error) {
    console.error(`[AI][FATAL_ERROR] contentId: ${contentId}`, error);
    try {
      const content = await ContentModel.findById(contentId);
      if (content) {
        content.aiStatus = "failed";
        content.embeddingStatus = "failed";
        content.aiError = error instanceof Error ? error.message : String(error);
        await content.save();
        if (content.userId) {
          const user = await UserModel.findById(content.userId);
          if (user && user.subscriptionPlan !== "pro") {
            await UserModel.updateOne(
              { _id: content.userId },
              { $inc: { aiCreditsRemaining: 1 } }
            );
            console.log(`[AI_REFUND] Refunded credit for content ${contentId} to user ${content.userId}`);
          }
        }
      }
    } catch (refundError) {
      console.error("[AI_REFUND_FAILED]", refundError);
    }
    throw error;
  } finally {
    currentlyProcessing.delete(contentId);
  }
};

/**
 * RAG Chat Engine (Production Grade - Non Streaming)
 * Generates grounded answers with full factual consistency.
 */
export const generateAiChatAnswer = async (
  query: string, 
  context: any[], 
  history: { role: 'user' | 'assistant', content: string }[] = []
): Promise<string> => {
  const contextBlob = context.map((c, i) => 
    `[Source ${i+1}]: Title: ${c.title} | Link: ${c.link} | Type: ${c.type} | ID: ${c._id}\nSummary: ${c.description || "No summary available."}`
  ).join("\n\n");

  const contextLabel = context.length > 0 ? `${context.length} source(s)` : "EMPTY";
  console.log(`[PROMPT_GENERATION_START] context=${contextLabel}`);

  const systemPrompt = `You are a high-fidelity "Second Brain" assistant. 
  Your primary directive is to synthesize answers using ONLY the provided context.
  
  CONTEXT DOCUMENTS:
  ${contextBlob || "No context available."}
  
  STRICT GROUNDING RULES:
  1. ONLY use information from the Context Documents above.
  2. If the answer is not in the context, say: "I don't have enough information in your Second Brain to answer that."
  3. If a source is present but says "No summary available", explain that the content couldn't be automatically retrieved initially. 
  4. IMPORTANT: Advise the user that they can try to RE-SCRAPE the link by clicking the "Lightning Bolt" icon on the card in their dashboard. This launches the "Deep Scraper" to bypass security blocks.
  5. Cite sources as [Source 1], [Source 2], etc.
  6. DO NOT use external knowledge or hallucinate facts.
  7. If context is empty, tell the user no relevant memories were found.`;

  try {
    console.log("[LLM_CALL_START]");
    const response = await invokeLLM({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-6),
        { role: "user", content: query }
      ],
      temperature: 0.1,
      max_tokens: 1024,
      stream: false,
    });

    const answer = response.choices[0]?.message?.content?.trim();
    console.log(`[LLM_SUCCESS] chars=${answer?.length ?? 0}`);
    return answer || "I'm sorry, I couldn't synthesize an answer.";
  } catch (error: any) {
    // Log internally with full details, but NEVER re-throw raw provider error
    console.error("[LLM_CALL_FAILED] code:", error?.code ?? "UNKNOWN");
    // Return graceful string — controller decides the final HTTP shape
    return "__LLM_FAILURE__";
  }
};

/**
 * RAG Chat Engine (Production Grade - Streaming)
 */
export const generateAiChatAnswerStream = async (
  query: string, 
  context: any[], 
  history: { role: 'user' | 'assistant', content: string }[] = [],
  onChunk: (chunk: string) => void
) => {
  try {
    if (!groq) throw new AIError(AIErrorCode.SYNTHESIS_ERROR, "AI service not configured.");

    const contextBlob = context.map((c, i) => 
      `[Source ${i+1}]: Title: ${c.title} | Link: ${c.link} | Type: ${c.type} | ID: ${c._id}\nSummary: ${c.description || "No summary available."}`
    ).join("\n\n");

    const systemPrompt = `You are a high-fidelity "Second Brain" assistant. 
    Your primary directive is to synthesize answers using ONLY the provided context.
    
    CONTEXT DOCUMENTS:
    ${contextBlob}
    
    STRICT GROUNDING RULES:
    1. ONLY use information from the Context Documents above.
    2. If the answer is not contained within the context, respond: "I'm sorry, but I don't have enough information in your Second Brain to answer that."
    3. If a source is present but says "No summary available", explain that the link content could not be automatically retrieved initially. 
    4. IMPORTANT: Tell the user they can try to RE-SCRAPE the link by clicking the "Lightning Bolt" icon on the card in their dashboard to bypass security blocks.
    5. Cite your sources using [Source 1], [Source 2], etc.
    6. DO NOT use external knowledge.
    7. If the context is empty, inform the user you have no relevant memories saved.`;

    console.log("[PROMPT_CREATED]");

    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-6),
        { role: "user", content: query }
      ],
      temperature: 0.1,
      stream: true,
    });

    console.log("[OPENAI_RESPONSE_START]");

    for await (const chunk of stream) {
      const content = chunk?.choices?.[0]?.delta?.content || "";
      if (content) onChunk(content);
    }
    
    console.log("[OPENAI_RESPONSE_COMPLETE]");
  } catch (error) {
    console.error("[CHAT_ERROR_STAGE] SERVICE_STREAMING", error);
    throw error;
  }
};

import { cosineSimilarity } from "../utils.js";

/**
 * Brain Intelligence Engine (Production Grade)
 * Implements deterministic analytics + semantic clustering + LLM synthesis.
 */

interface Cluster {
  name: string;
  count: number;
  confidence?: number;
  sources: { title: string, id: string, link: string }[];
}

/**
 * Semantic Clustering Engine
 * Groups related memories based on vector similarity.
 * Greedy algorithm: O(N) complexity for low-latency dashboard loads.
 */
export const generateSemanticClusters = async (contents: any[]) => {
  const clusters: Cluster[] = [];
  const processedIds = new Set<string>();
  const validContents = contents.filter(c => c.embedding && c.embedding.length > 0);

  for (const item of validContents) {
    const itemId = item._id.toString();
    if (processedIds.has(itemId)) continue;

    const similar = validContents.filter(other => {
      if (processedIds.has(other._id.toString())) return false;
      return cosineSimilarity(item.embedding, other.embedding) > 0.78;
    });

    if (similar.length >= 2) {
      similar.forEach(s => processedIds.add(s._id.toString()));
      
      // Calculate Confidence (Average Similarity to representative item)
      const totalSim = similar.reduce((acc, s) => acc + cosineSimilarity(item.embedding, s.embedding), 0);
      const confidence = (totalSim / similar.length).toFixed(4);

      clusters.push({
        name: item.title, // Placeholder, LLM will refine
        count: similar.length,
        confidence: Number(confidence),
        sources: similar.map(s => ({ title: s.title, id: s._id, link: s.link }))
      });
    }
  }

  return clusters;
};

export const generateBrainIntelligence = async (userId: string, contents: any[], deterministicData: any) => {
  if (!groq) throw new Error("AI service not configured.");

  // 1. Structural Analytics Extraction
  const totalCount = contents.length;

  // 2. Perform Semantic Clustering
  const clusters = await generateSemanticClusters(contents);

  // 3. ENRICHED PROMPTING (Consuming Deterministic Analytics)
  const analyticsSummary = `
  HARD DATA ANALYTICS:
  - Total Memories: ${totalCount}
  - Content Distribution: ${JSON.stringify(deterministicData.contentDistribution)}
  - Top Semantic Tags (Recent): ${JSON.stringify(deterministicData.topTags)}
  - Top Information Domains: ${JSON.stringify(deterministicData.topDomains)}
  
  TEMPORAL INTELLIGENCE:
  - Emerging Interests: ${JSON.stringify(deterministicData.temporalShifts.emerging)}
  - Declining Focus: ${JSON.stringify(deterministicData.temporalShifts.declining)}
  - Learning Consistency (0-1): ${deterministicData.temporalShifts.consistencyScore}

  SEMANTIC CLUSTERS:
  ${clusters.map((cl, i) => `Cluster ${i+1}: ${cl.count} notes. Examples: ${cl.sources.map(s => s.title).join(", ")}`).join("\n")}
  `;

  const systemPrompt = `You are a "Private Intelligence Architect" for a Second Brain.
  Your goal is to provide deep, behavioral, and editorial insights about the user's learning patterns.
  
  EDITORIAL GUARDRAILS:
  1. DO NOT be generic. REJECT insights like "You save many videos" or "You are interested in X".
  2. FOCUS on behavioral depth. E.g., "Your shift from tutorial-based content to architecture-level deep dives suggests a pivot toward implementation expertise."
  3. SEMANTIC DEPTH: Look for "Semantic Bridges" between seemingly unrelated topics.
  4. NO QUANTITATIVE FILLER: Mentioning counts is only allowed if it supports a deep behavioral observation.
  
  CRITICAL: 
  - USE the "TEMPORAL INTELLIGENCE" to detect intellectual shifts.
  - If a topic is in "Emerging Interests", highlight it as a new learning path.
  - If a topic is in "Declining Focus", consider if it's a pivot or a completed objective.
  - Reference the "Learning Consistency" to praise or encourage the user's habit.
  - Each insight must cite sources from the Semantic Clusters or Recent Focus.

  Return a strict JSON object:
  {
    "summary": "Short editorial summary of the current brain state.",
    "insights": [
      {
        "category": "Learning Trend" | "Emerging Interest" | "Knowledge Gap" | "Behavioral Pattern",
        "title": "Short punchy title",
        "description": "Deep behavioral insight reasoning.",
        "confidence": "Strong" | "Moderate" | "Emerging",
        "qualityScore": number (1-10, based on semantic depth and uniqueness),
        "sources": [{ "title": "Note Title", "id": "ID", "link": "URL" }]
      }
    ]
  }
  
  Data Analytics:
  ${analyticsSummary}`;

  console.log("[AI_INSIGHTS_START]");
  try {
    const response = await invokeLLM({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Analyze my brain patterns with high-fidelity behavioral reasoning." }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4
    });

    const llmResponse = response.choices[0]?.message?.content || "{}";
    console.log("[LLM_RESPONSE_RAW]", llmResponse);
    
    let rawResult;
    try {
      rawResult = JSON.parse(llmResponse);
    } catch (parseError) {
      console.error("[AI_CHAT_FAILURE] BRAIN_INTEL_PARSE_ERROR", { llmResponse, parseError });
      rawResult = { summary: "Neural synthesis degraded.", insights: [] };
    }
    
    // POST-PROCESSING: Quality Filtering
    if (rawResult.insights && Array.isArray(rawResult.insights)) {
      rawResult.insights = rawResult.insights
        .filter((i: any) => i && i.qualityScore >= 7)
        .sort((a: any, b: any) => b.qualityScore - a.qualityScore)
        .slice(0, 5);
    }

    return rawResult;
  } catch (err: any) {
    console.error("[AI_INTELLIGENCE_SYNTHESIS_FAILURE]", err.message);
    throw new AIError(AIErrorCode.SYNTHESIS_ERROR, `Failed to synthesize patterns: ${err.message}`);
  }
};

/**
 * Deterministic Analytics Engine
 * Uses MongoDB aggregations to generate high-fidelity structural data.
 */
export const getDeterministicAnalytics = async (userId: string) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [distribution, tagsRecent, tagsMonth, domains, trends] = await Promise.all([
      // 1. Content Distribution
      ContentModel.aggregate([
        { $match: { userId: userObjectId } },
        { $group: { _id: "$type", count: { $sum: 1 } } }
      ]),

      // 2. Recent Tags (Last 7 days)
      ContentModel.aggregate([
        { $match: { userId: userObjectId, createdAt: { $gte: sevenDaysAgo } } },
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // 3. Historical Tags (Last 30 days)
      ContentModel.aggregate([
        { $match: { userId: userObjectId, createdAt: { $gte: thirtyDaysAgo } } },
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // 4. Top Domains (FIXED $split syntax)
      ContentModel.aggregate([
        { $match: { userId: userObjectId, link: { $regex: "//" } } }, // Only links with //
        { 
          $project: { 
            domain: { 
              $arrayElemAt: [
                { $split: [ { $arrayElemAt: [ { $split: ["$link", "//"] }, 1 ] }, "/" ] }, 
                0 
              ] 
            } 
          } 
        },
        { $group: { _id: "$domain", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),

      // 5. Daily Activity (Consistency)
      ContentModel.aggregate([
        { $match: { userId: userObjectId, createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Identify Shifts
    const recentTagSet = new Set(tagsRecent.map(t => t._id));
    const emergingTags = tagsRecent.filter(t => !tagsMonth.slice(0, 5).some(mt => mt._id === t._id));
    const decliningTags = tagsMonth.filter(t => !recentTagSet.has(t._id)).slice(0, 3);
    
    // Consistency Calculation
    const activeDays = trends.length;
    const consistencyScore = (activeDays / 30).toFixed(2);

    const analyticsData = {
      contentDistribution: distribution,
      topTags: tagsRecent.slice(0, 10),
      topDomains: domains,
      temporalShifts: {
        emerging: emergingTags.map(t => t._id),
        declining: decliningTags.map(t => t._id),
        consistencyScore: Number(consistencyScore)
      },
      activityTrend: trends
    };

    console.log("[DETERMINISTIC_ANALYTICS_SUCCESS]", {
      userId,
      distCount: distribution.length,
      recentTags: tagsRecent.length
    });

    return analyticsData;
  } catch (error: any) {
    console.error("[DETERMINISTIC_ANALYTICS_FAILURE]", error.message);
    // Return minimal valid structure to prevent pipeline crash
    return {
      contentDistribution: [],
      topTags: [],
      topDomains: [],
      temporalShifts: { emerging: [], declining: [], consistencyScore: 0 },
      activityTrend: []
    };
  }
};
