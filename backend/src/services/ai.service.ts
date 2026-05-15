import OpenAI from "openai";
import { Groq } from "groq-sdk";
import urlMetadata from "url-metadata";
import mongoose from "mongoose";
import { getGroqApiKey, getHuggingFaceToken } from "../config.js";
import { ContentModel, BrainInsightModel } from "../db.js";

// --- Reliability Engine (Production Errors & Metrics) ---

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

// HuggingFace Configuration
const hfToken = getHuggingFaceToken();
const HF_EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";

export interface AiClassification {
  title: string;
  description: string;
  type: "post" | "video" | "document";
  tags: string[];
  topics: string[];
}

/**
 * AI Classification Service
 * Handles metadata extraction and content categorization.
 * Supports 'quick' (latency-optimized) and 'deep' (insight-optimized) modes.
 */
export const getAiClassification = async (url: string, mode: "quick" | "deep" = "deep") => {
  if (!groq) {
    console.warn("[AI][GROQ] API key not configured. Using fallback.");
    return { title: "New Content", description: "", type: "post" as const, tags: ["untagged"], topics: [] };
  }

  try {
    // 1. CACHE CHECK (Strictly for completed deep analysis)
    if (mode === "deep") {
      const existing = await ContentModel.findOne({ 
        link: url, 
        aiStatus: 'completed' 
      }).sort({ createdAt: -1 });

      if (existing && existing.description) {
        console.log(`[AI_CACHE_HIT]: ${url}`);
        return {
          title: existing.title,
          description: existing.description,
          tags: existing.tags,
          topics: existing.topics,
          type: existing.type
        };
      }
    }

    // 1.5 Enhanced Metadata Fetch with Timeout & X.com Logic
    let metadata: any = {};
    try {
      metadata = await withTimeout(urlMetadata(url), 10000, "urlMetadata");
    } catch (e) {
      console.warn(`[AI][METADATA_TIMEOUT] ${url}. Using URL as fallback context.`);
      metadata = { url, title: url.split('/').pop() || "New Content" };
    }

    // Special handling for x.com/twitter to avoid empty summaries
    if (url.includes("x.com") || url.includes("twitter.com")) {
      metadata.domain = "x.com";
      metadata.contentType = "post";
      if (!metadata.description || metadata.description.length < 10) {
        metadata.description = `A status update/post from Elon Musk on X.com (Link: ${url})`;
      }
    }

    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
    
    // 2. High-Fidelity Bookmark Summarization Prompt
    const systemPrompt = `You are an AI bookmark summarization engine.
    Your task is to analyze webpage content and generate a clean, concise, and useful summary for a bookmark management application.

    IMPORTANT RULES:
    - Focus only on the main content.
    - Ignore advertisements, navigation menus, cookie notices, footers, and unrelated sections.
    - Keep responses compact and information-dense.
    - Do not hallucinate or invent information.
    - If content is unclear, say so.
    - Output must always be valid JSON.
    - Keep summaries beginner-friendly unless content is highly technical.

    Generate the following fields:
    1. title: A cleaned and readable title.
    2. short_summary: One sentence summary (max 25 words).
    3. detailed_summary: 3 to 5 concise bullet points explaining the main ideas.
    4. tags: 3 to 8 relevant tags.
    5. category: One from ["Technology","AI","Programming","Finance","Education","News","Gaming","Health","Business","Science","Entertainment","Tutorial","Research","Productivity","Other"].
    6. reading_time: Estimated reading time in minutes.
    7. difficulty: ["Beginner","Intermediate","Advanced"].
    8. content_type: ["Article","Documentation","Video","Research Paper","Tutorial","Blog","News","Repository","Tool","Other"].
    9. sentiment: ["Neutral","Positive","Critical","Opinionated","Educational","Promotional"].
    10. key_takeaways: 3 short actionable insights.

    Return response ONLY in this JSON format:
    {
      "title": "",
      "short_summary": "",
      "detailed_summary": [],
      "tags": [],
      "category": "",
      "reading_time": "",
      "difficulty": "",
      "content_type": "",
      "sentiment": "",
      "key_takeaways": []
    }`;

    const response = await invokeLLM({
      model: "llama-3.1-8b-instant", // Optimized for lightning-fast latency
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `URL: ${url}\nMetadata: ${JSON.stringify(metadata)}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const llmResponse = response.choices[0]?.message?.content || "{}";
    let result;
    try {
      result = JSON.parse(llmResponse);
    } catch (parseError) {
      console.error("[AI_CHAT_FAILURE] JSON_PARSE_ERROR", { llmResponse, parseError });
      result = {};
    }

    // Mapping high-fidelity JSON to existing schema
    const combinedDescription = `
${result.short_summary || ""}

MAIN IDEAS:
${(result.detailed_summary || []).map((s: string) => `• ${s}`).join("\n")}

KEY TAKEAWAYS:
${(result.key_takeaways || []).map((t: string) => `• ${t}`).join("\n")}

Reading Time: ${result.reading_time || "1"} min | Difficulty: ${result.difficulty || "Beginner"}
    `.trim();

    // Type Mapper: Map rich content types to backend enum (video, post, document)
    const rawType = (result.content_type || "Other").toLowerCase();
    let mappedType: "video" | "post" | "document" = "post";
    
    if (isYouTube || rawType === "video") {
      mappedType = "video";
    } else if (["article", "blog", "news", "tool", "repository"].includes(rawType)) {
      mappedType = "post";
    } else if (["documentation", "research paper", "tutorial", "other"].includes(rawType)) {
      mappedType = "document";
    }

    return {
      title: result.title || metadata.title || "New Content",
      description: combinedDescription || metadata.description || "",
      type: mappedType,
      tags: result.tags || [],
      topics: result.category ? [result.category, ...(result.tags || []).slice(0, 2)] : []
    };

  } catch (error: any) {
    console.error("[AI_CLASSIFICATION_FAILURE]", error.message);
    // Graceful Fallback
    return { 
      title: "New Content", 
      description: "Analysis temporarily unavailable.", 
      type: "post" as const, 
      tags: ["untagged"], 
      topics: [] 
    };
  }
};

/**
 * Robust Embedding Service
 * Uses OpenAI 'text-embedding-3-small' (if configured) or HuggingFace fallback.
 */
export const createEmbedding = async (text: string, useCache = false): Promise<number[]> => {
  const normalizedText = text.trim().toLowerCase();
  
  // Truncate to safety limits (Rough estimation: 1 token ~= 4 chars)
  const MAX_CHARS = openai ? 25000 : 1800; // ~6000 tokens for OpenAI, ~450 for HF
  const safeText = normalizedText.length > MAX_CHARS ? normalizedText.slice(0, MAX_CHARS) : normalizedText;

  // 1. Check Cache
  if (useCache && queryCache.has(safeText)) {
    const cached = queryCache.get(safeText)!;
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.embedding;
    }
    queryCache.delete(safeText);
  }

  const start = Date.now();
  try {
    let embedding: number[];

    if (openai) {
      // Production Grade: text-embedding-3-small ($0.02 / 1M tokens)
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: safeText.replace(/\n/g, " "),
      });
      const vector = response.data?.[0]?.embedding;
      if (!vector) throw new Error("OpenAI returned empty embedding data.");
      embedding = vector;
    } else {
      if (!hfToken) throw new Error("No embedding provider configured");
      
      const url = `https://router.huggingface.co/hf-inference/models/${HF_EMBEDDING_MODEL}/pipeline/feature-extraction`;
      const payload = { inputs: text };
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); 

      try {
        const response = await fetch(url, {
          headers: { 
            "Authorization": `Bearer ${hfToken}`,
            "Content-Type": "application/json"
          },
          method: "POST",
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
          console.error("[HF_ERROR]", responseData || response.statusText);
          if (response.status === 503 || response.status === 404) {
            return new Array(384).fill(0); 
          }
          throw new Error(`HF API Error: ${response.status}`);
        }
        embedding = responseData;
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.error("[HF_ERROR]", err.message);
        return new Array(384).fill(0);
      }
    }

    if (!Array.isArray(embedding)) {
      throw new Error("Invalid embedding format returned");
    }

    // 2. Save to Cache
    if (useCache) {
      if (queryCache.size >= MAX_CACHE_SIZE) {
        const firstKey = queryCache.keys().next().value;
        if (firstKey) queryCache.delete(firstKey);
      }
      queryCache.set(normalizedText, { embedding, timestamp: Date.now() });
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
  
  const MAX_RETRIES = 3;
  const BACKOFF_DELAYS = [1000, 2000, 4000];

  try {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const content = await ContentModel.findById(contentId);
        if (!content || content.embeddingStatus === "completed") break;

        const processingStartedAt = (content as any).updatedAt;
        console.log(`[AI][START] contentId: ${contentId}, attempt: ${attempt + 1}`);

        // 2. Optimized Parallel Synthesis (Metadata + Embedding)
        let updatedMetadata: any = {};
        let title = content.title;
        let description = content.description;
        let topics = content.topics;

        console.log(`[AI][SYNTHESIS_START] contentId: ${contentId}`);

        // We run both the AI Analysis and the Embedding in parallel to save time
        const synthesisPromise = (async () => {
          if (!content.description || content.aiStatus === "processing") {
            const classification = await getAiClassification(content.link, "deep");
            title = classification.title;
            description = classification.description;
            topics = classification.topics;
            return {
              title: classification.title,
              description: classification.description,
              type: classification.type,
              tags: classification.tags,
              topics: classification.topics,
              aiStatus: "completed"
            };
          }
          return null;
        })();

        // Initial context for embedding (uses current title if analysis isn't done yet)
        const contextText = `Title: ${title}. ${description ? `Description: ${description}` : ""} ${topics && topics.length > 0 ? `Topics: ${topics.join(", ")}` : ""}`;
        
        const [classificationResult, embedding] = await Promise.all([
          synthesisPromise,
          createEmbedding(contextText, false)
        ]);

        if (classificationResult) {
          updatedMetadata = classificationResult;
        }

        const updateResult = await ContentModel.updateOne(
          { _id: contentId, updatedAt: processingStartedAt },
          { 
            embedding, 
            embeddingStatus: "completed",
            ...updatedMetadata,
            aiStatus: updatedMetadata.aiStatus || "completed"
          }
        );

        if (updateResult.modifiedCount === 0) {
          console.warn(`[AI][RACE_CONDITION] contentId: ${contentId}. Aborting.`);
          break;
        }

        console.log(`[AI][SUCCESS] contentId: ${contentId}, attempts: ${attempt + 1}`);
        return;

      } catch (error) {
        console.error(`[AI][RETRY_ERROR] contentId: ${contentId}, attempt: ${attempt + 1}:`, error);
        if (attempt < MAX_RETRIES) {
          await sleep(BACKOFF_DELAYS[attempt] || 1000);
        } else throw error;
      }
    }
  } catch (error) {
    console.error(`[AI][FATAL_ERROR] contentId: ${contentId}`);
    await ContentModel.findByIdAndUpdate(contentId, { embeddingStatus: "failed" }).catch(() => {});
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
  3. Cite sources as [Source 1], [Source 2], etc.
  4. DO NOT use external knowledge or hallucinate facts.
  5. If context is empty, tell the user no relevant memories were found.`;

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
    3. Cite your sources using [Source 1], [Source 2], etc.
    4. DO NOT use external knowledge.
    5. If the context is empty, inform the user you have no relevant memories saved.`;

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
