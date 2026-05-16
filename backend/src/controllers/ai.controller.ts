import type { Request, Response } from "express";
import mongoose from "mongoose";
import { getAiClassification, processContentEmbedding, generateAiChatAnswerStream, generateAiChatAnswer, createEmbedding, generateBrainIntelligence, getDeterministicAnalytics, AIError, AIErrorCode } from "../services/ai.service.js";
import { cosineSimilarity } from "../utils.js";
import { ContentModel, BrainInsightModel } from "../db.js";
import { z } from "zod";

// ... existing code ...

/**
 * AI Chat Controller (RAG + SSE Streaming)
 * Handles conversational queries with real-time streaming response.
 */
const chatRetrievalCache = new Map<string, { results: any[], timestamp: number }>();
const RETRIEVAL_CACHE_TTL = 5 * 60 * 1000; // 5 mins

export const aiChatController = async (req: Request, res: Response) => {
  const { query, history = [], stream = false } = req.body;
  const userId = req.userId;
  const cacheKey = `${userId}:${query.toLowerCase().trim()}`;

  console.log("[CHAT_QUERY]", query);

  try {
    if (!query) {
      return res.status(400).json({ success: false, error: "Query is required." });
    }

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
    }

    // 1. Generate Query Embedding
    console.log("[GENERATE_EMBEDDING_START]");
    let queryEmbedding;
    try {
      queryEmbedding = await createEmbedding(query, true);
      console.log("[EMBEDDING_RESULT]", queryEmbedding ? `Vector(${queryEmbedding.length})` : "null");
    } catch (embError) {
      console.error("[EMBEDDING_STEP_FAILED]", embError);
      queryEmbedding = null;
    }

    // 2. Optimized Hybrid Context Retrieval (3-Tier Fallback)
    console.log("[VECTOR_SEARCH_START]");
    let topContext = [];
    const cached = chatRetrievalCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < RETRIEVAL_CACHE_TTL)) {
      console.log("[RAG_CACHE_HIT]", cacheKey);
      topContext = cached.results;
    } else {
      // ── Tier 1: MongoDB Atlas Vector Search ──────────────────────────
      if (queryEmbedding) {
        try {
          const vectorResults = await ContentModel.aggregate([
            {
              $vectorSearch: {
                index: "vector_index",
                path: "embedding",
                queryVector: queryEmbedding,
                numCandidates: 100,
                limit: 10,
                filter: { userId: new mongoose.Types.ObjectId(userId) }
              }
            },
            {
              $project: {
                title: 1, link: 1, type: 1, description: 1,
                similarity: { $meta: "vectorSearchScore" }
              }
            }
          ]);
          if (vectorResults.length > 0) {
            topContext = vectorResults;
            console.log("[TIER_1_VECTOR_HIT]", vectorResults.length);
          } else {
            console.warn("[TIER_1_VECTOR_EMPTY]");
          }
        } catch (vErr: any) {
          console.warn("[TIER_1_VECTOR_FAILED]", vErr.message);
        }
      }

      // ── Tier 2: MongoDB Full-Text Search ─────────────────────────────
      if (topContext.length === 0) {
        try {
          const textResults = await ContentModel.find({
            userId,
            $text: { $search: query }
          })
          .select("title link type description")
          .limit(8);
          if (textResults.length > 0) {
            topContext = textResults;
            console.log("[TIER_2_TEXT_HIT]", textResults.length);
          } else {
            console.warn("[TIER_2_TEXT_EMPTY]");
          }
        } catch (tErr: any) {
          console.warn("[TIER_2_TEXT_FAILED]", tErr.message);
        }
      }

      // ── Tier 3: In-Memory Cosine Similarity (no index required) ──────
      if (topContext.length === 0 && queryEmbedding) {
        try {
          console.log("[TIER_3_COSINE_START]");
          const allContent = await ContentModel.find({ userId })
            .select("+embedding title link type description")
            .limit(200);
          
          const withEmbeddings = allContent.filter(c => c.embedding && c.embedding.length > 0);
          
          if (withEmbeddings.length > 0) {
            const scored = withEmbeddings.map(c => ({
              doc: c,
              score: cosineSimilarity(queryEmbedding, c.embedding as number[])
            }));
            scored.sort((a, b) => b.score - a.score);
            topContext = scored.slice(0, 5).map(s => s.doc);
            console.log("[TIER_3_COSINE_HIT]", topContext.length);
          } else {
            // ── Tier 3b: Recent content (absolute fallback) ───────────
            console.warn("[TIER_3_COSINE_NO_EMBEDDINGS] Using recency fallback.");
            topContext = await ContentModel.find({ userId })
              .select("title link type description")
              .sort({ createdAt: -1 })
              .limit(5);
            console.log("[TIER_3B_RECENCY_HIT]", topContext.length);
          }
        } catch (cErr: any) {
          console.warn("[TIER_3_COSINE_FAILED]", cErr.message);
        }
      }

      // Final recency fallback when embedding is also null
      if (topContext.length === 0) {
        try {
          topContext = await ContentModel.find({ userId })
            .select("title link type description")
            .sort({ createdAt: -1 })
            .limit(5);
          console.log("[TIER_3B_RECENCY_FALLBACK_HIT]", topContext.length);
        } catch (rErr: any) {
          console.warn("[RECENCY_FALLBACK_FAILED]", rErr.message);
        }
      }

      chatRetrievalCache.set(cacheKey, { results: topContext, timestamp: Date.now() });
    }
    console.log("[VECTOR_RESULTS]", topContext.length);

    const sources = topContext.map(c => ({
      _id: c._id,
      title: c.title,
      link: c.link,
      type: c.type
    }));

    // 3. Execution (Streaming vs Non-Streaming)
    if (stream) {
      try {
        console.log("[LLM_CALL_START] STREAMING");
        res.write(`data: ${JSON.stringify({ type: "metadata", sources })}\n\n`);

        await generateAiChatAnswerStream(query, topContext, history, (chunk) => {
          res.write(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`);
        });

        console.log("[CHAT_COMPLETE]");
        res.write(`data: [DONE]\n\n`);
        return res.end();
      } catch (streamError) {
        console.error("[INFERENCE_STEP_FAILED] STREAMING", streamError);
        res.write(`data: ${JSON.stringify({ type: "error", message: "Brain synthesis degraded." })}\n\n`);
        return res.end();
      }
    } else {
      console.log("[LLM_CALL_START] NON_STREAMING");
      const answer = await generateAiChatAnswer(query, topContext, history);

      if (answer === "__LLM_FAILURE__") {
        console.error("[INFERENCE_DEGRADED] Returning graceful fallback to client.");
        return res.status(200).json({
          success: true,
          answer: "Your Second Brain is temporarily unavailable for synthesis.",
          sources: []
        });
      }

      console.log("[CHAT_COMPLETE]");
      return res.status(200).json({ success: true, answer, sources });
    }

  } catch (error: any) {
    console.error("[CHAT_CRITICAL_FAILURE]", error);
    if (stream) {
      res.write(`data: ${JSON.stringify({ type: "error", message: "Critical failure." })}\n\n`);
      return res.end();
    }
    return res.status(200).json({ success: false, answer: "Brain synthesis temporarily unavailable.", sources: [] });
  }
};


const aiTagSchema = z.object({
  url: z.string().url("Invalid URL"),
});

/**
 * AI Tag Controller
 * Handles auto-classification of URLs.
 * Returns structured error responses for frontend resilience.
 */
export const aiTagController = async (req: Request, res: Response) => {
  try {
    const parsed = aiTagSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ 
        success: false, 
        message: "Please provide a valid web URL.",
        details: parsed.error.issues 
      });
    }

    const { url } = parsed.data;
    
    // Attempt classification with the service
    const classification = await getAiClassification(url, "quick");

    // If classification is returned with fallback values, we still consider it a success
    // but the frontend can decide how to display it.
    res.json({
      success: true,
      data: classification
    });

  } catch (error: any) {
    // Log the actual error for the engineer
    console.error(`[AI_CONTROLLER_FAILURE]: ${error.message}`, {
      url: req.body?.url,
      stack: error.stack
    });

    // Return a clean, non-leaking message to the client
    const isTimeout = error.message?.includes("timeout") || error.code === "ETIMEDOUT";
    
    res.status(500).json({ 
      success: false, 
      message: isTimeout 
        ? "The website took too long to respond. Try filling the details manually." 
        : "AI was unable to analyze this link. Please check the URL or try again."
    });
  }
};

/**
 * AI Reprocess Controller
 * Manually triggers AI analysis for a specific piece of content.
 */
export const aiReprocessController = async (req: Request, res: Response) => {
  try {
    const { contentId } = req.body;
    const userId = req.userId;

    if (!contentId) {
      return res.status(400).json({ success: false, message: "Content ID is required." });
    }

    const content = await ContentModel.findOne({ _id: contentId, userId });

    if (!content) {
      return res.status(404).json({ success: false, message: "Memory not found." });
    }

    // Skip if already deeply synthesized and not forced
    if (content.aiStatus === "summarized" || content.aiStatus === "completed") {
      return res.json({ success: true, data: content, message: "Already synthesized." });
    }

    // Trigger Synthesis
    await ContentModel.updateOne({ _id: contentId }, { aiStatus: "processing" });

    // Background Task
    processContentEmbedding(contentId).catch(err => console.error("[BG_SYNTHESIS_FAILED]", err));

    res.json({
      success: true,
      message: "Synthesis triggered."
    });

  } catch (error: any) {
    console.error("[AI_REPROCESS_FAILURE]", error.message);
    res.status(500).json({ success: false, message: "Failed to synthesize memory." });
  }
};

/**
 * AI Insights Controller (Production Grade)
 * Orchestrates deterministic analytics, semantic clustering, and LLM synthesis with advanced caching.
 */
export const aiInsightsController = async (req: Request, res: Response) => {
  const userId = req.userId;
  console.log("[AI_INSIGHTS_REQUEST_START]", { userId });

  try {
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // 1. Fetch Version & Cache State
    const [currentCount, cached] = await Promise.all([
      ContentModel.countDocuments({ userId }),
      BrainInsightModel.findOne({ userId })
    ]);
    console.log("[DATA_METRICS]", { userId, currentCount, hasCache: !!cached });

    // 2. Intelligent Cache Invalidation
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const isVersionMatch = cached?.contentVersion === currentCount;
    const isFresh = cached && (Date.now() - new Date(cached.generatedAt).getTime() < TWENTY_FOUR_HOURS);

    if (isVersionMatch && isFresh) {
      console.log("[AI_INSIGHTS_CACHE_HIT]", { userId, version: currentCount });
      return res.json({ success: true, data: cached });
    }

    console.log("[AI_INSIGHTS_CACHE_MISS]", { 
      reason: !cached ? "no_cache" : !isVersionMatch ? "version_mismatch" : "expired" 
    });

    // 3. Fetch Data for Analysis
    const [contents, deterministicData] = await Promise.all([
      ContentModel.find({ userId })
        .select("+embedding title type tags createdAt link description")
        .sort({ createdAt: -1 }),
      getDeterministicAnalytics(userId.toString())
    ]);
    console.log("[ANALYSIS_DATA_FETCHED]", { contentCount: contents.length });

    if (contents.length < 3) {
      return res.json({
        success: true,
        data: {
          summary: "Your brain is in its early stages of growth.",
          insights: [{
            category: "Emerging Pattern",
            title: "Knowledge Seedling",
            description: "Continue adding content to unlock deep semantic patterns and behavioral trends.",
            confidence: "Strong",
            qualityScore: 10,
            sources: []
          }]
        }
      });
    }

    // 4. Generate Intelligence (Hybrid Pipeline)
    const intelligence = await generateBrainIntelligence(userId.toString(), contents, deterministicData);
    console.log("[INTELLIGENCE_SYNTHESIZED]", { insightCount: intelligence.insights?.length });

    // 5. Persistence (Update Cache)
    const updated = await BrainInsightModel.findOneAndUpdate(
      { userId },
      { 
        ...intelligence,
        generatedAt: new Date(),
        contentVersion: currentCount 
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: updated
    });

  } catch (error: any) {
    const isAIError = error.name === "AIError";
    const errorCode = isAIError ? error.code : "INTERNAL_ERROR";
    
    console.error("[AI_INSIGHTS_FAILURE]", {
      userId,
      code: errorCode,
      message: error.message
    });
    
    // Return structured failure with fallback to structural data only
    res.status(isAIError ? 503 : 500).json({ 
      success: false, 
      error: errorCode,
      message: "Our neural engine is currently heavy-loaded. Deep insights are temporarily unavailable, but your structural brain metrics remain active.",
      fallback: {
        summary: "Neural synthesis is currently degraded. Please check back in a few minutes.",
        insights: []
      }
    });
  }
};
