import OpenAI from "openai";
import urlMetadata from "url-metadata";
import { getGroqApiKey, getHuggingFaceToken } from "../config.js";
import { ContentModel } from "../db.js";

// Initialize Groq (OpenAI Compatible)
const groqApiKey = getGroqApiKey();
const groq = groqApiKey ? new OpenAI({
  apiKey: groqApiKey,
  baseURL: "https://api.groq.com/openai/v1",
}) : null;

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

    const metadata = await urlMetadata(url);
    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
    
    // 2. Select Prompt based on Mode
    const systemPrompt = mode === "quick" 
      ? `You are a lightweight metadata agent. Extract a 1-line summary and 3 tags. 
         Respond ONLY with a JSON object: { "title": string, "description": string, "tags": string[] }`
      : `You are a high-performance knowledge engine for a "Second Brain" app.
         Synthesize the provided content into a deep, semantic insight.
         Guidelines:
         - "title": Concise, editorial title.
         - "description": High-quality synthesis. ${isYouTube ? "Focus on core takeaways from the video context." : "Summarize the key value proposition."}
         - "type": "video", "post", or "document".
         - "tags": 3-5 specific keywords.
         - "topics": 2-3 broad knowledge domains.
         Respond ONLY with a valid JSON object.`;

    const response = await groq.chat.completions.create({
      model: mode === "quick" ? "llama-3-8b-8192" : "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `URL: ${url}\nMetadata: ${JSON.stringify(metadata)}` },
      ],
      response_format: { type: "json_object" },
      temperature: mode === "quick" ? 0.3 : 0.7, // Lower temperature for faster, more predictable quick mode
    });

    const result = JSON.parse(response.choices?.[0]?.message?.content || "{}");
    
    return {
      title: result.title || metadata.title || "Untitled",
      description: result.description || metadata.description || "",
      tags: result.tags || (mode === "quick" ? ["web"] : []),
      topics: result.topics || [],
      type: result.type || (isYouTube ? "video" : "post")
    };

  } catch (error: any) {
    console.error(`[AI_SERVICE_ERROR][${mode.toUpperCase()}]: ${error.message}`);
    return {
      title: "Web Content",
      description: "Synthesis in progress...",
      tags: ["web"],
      topics: ["uncategorized"],
      type: "post"
    };
  }
};

/**
 * Uses HuggingFace Inference API to generate embeddings.
 */
export const createEmbedding = async (text: string, useCache = false): Promise<number[]> => {
  if (!hfToken) throw new Error("HuggingFace token not configured");

  const normalizedText = text.trim().toLowerCase();

  // 1. Check Cache
  if (useCache && queryCache.has(normalizedText)) {
    const cached = queryCache.get(normalizedText)!;
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[AI][CACHE_HIT] Query: "${normalizedText.substring(0, 20)}..."`);
      return cached.embedding;
    }
    queryCache.delete(normalizedText);
  }

  console.log(`[AI][EMBEDDING_START] HF Model: ${HF_EMBEDDING_MODEL}`);

  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_EMBEDDING_MODEL}`,
      {
        headers: { Authorization: `Bearer ${hfToken}` },
        method: "POST",
        body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HF API Error: ${response.status} - ${errorText}`);
    }

    const embedding = await response.json();

    // 2. Save to Cache
    if (useCache && Array.isArray(embedding)) {
      if (queryCache.size >= MAX_CACHE_SIZE) {
        const firstKey = queryCache.keys().next().value;
        if (firstKey) queryCache.delete(firstKey);
      }
      queryCache.set(normalizedText, { embedding, timestamp: Date.now() });
    }

    return embedding;
  } catch (error) {
    console.error("[AI][HF_ERROR]:", error);
    throw error;
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

        const contextText = `Title: ${content.title}. ${content.description ? `Description: ${content.description}` : ""} ${content.topics && content.topics.length > 0 ? `Topics: ${content.topics.join(", ")}` : ""}`;
        const embedding = await createEmbedding(contextText, false);

        const updateResult = await ContentModel.updateOne(
          { _id: contentId, updatedAt: processingStartedAt },
          { embedding, embeddingStatus: "completed" }
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
 * RAG Chat Engine (Production Grade)
 * Generates streaming answers grounded in user context with conversational memory.
 */
export const generateAiChatAnswerStream = async (
  query: string, 
  context: any[], 
  history: { role: 'user' | 'assistant', content: string }[] = [],
  onChunk: (chunk: string) => void
) => {
  if (!groq) throw new Error("AI service not configured.");

  const contextBlob = context.map((c, i) => 
    `[Source ${i+1}]: Title: ${c.title} | Link: ${c.link} | Type: ${c.type} | ID: ${c._id}\nSummary: ${c.description || "No summary available."}`
  ).join("\n\n");

  const systemPrompt = `You are the user's private "Second Brain" assistant.
  Your goal is to answer questions using ONLY the provided knowledge sources below.
  
  Strict Production Guardrails:
  1. Answer ONLY using the retrieved context.
  2. If the answer is not in the context, say: "I could not find relevant information in your saved knowledge."
  3. DO NOT use outside knowledge, DO NOT invent facts, and DO NOT hallucinate.
  4. Always cite your sources using [1], [2] format at the end of relevant sentences.
  5. Use markdown for structure (bolding, lists).
  6. Tone: Intelligent, concise, and professional.
  
  Retrieved Context:
  ${contextBlob}`;

  console.log(`[RAG_DEBUG][SYSTEM_PROMPT_BUILT]: Context length: ${contextBlob.length} chars`);
  console.log(`[RAG_DEBUG][PROMPT_PREVIEW]:\n${systemPrompt.substring(0, 500)}...`);

  const stream = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      ...history.slice(-6), // Keep last 3 turns
      { role: "user", content: query }
    ],
    temperature: 0.1, // Near-zero for extreme factual consistency
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) onChunk(content);
  }
};
