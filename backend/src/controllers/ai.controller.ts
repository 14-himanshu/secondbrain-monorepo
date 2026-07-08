import type { Request, Response } from "express";
import mongoose from "mongoose";
import { getAiClassification, processContentEmbedding, generateAiChatAnswerStream, generateAiChatAnswer, createEmbedding, generateBrainIntelligence, getDeterministicAnalytics, AIError, AIErrorCode } from "../services/ai.service.js";
import { cosineSimilarity } from "../utils.js";
import { ContentModel, BrainInsightModel, UserModel } from "../db.js";
import { z } from "zod";
import { enqueueAiIngestionJob } from "../queue/ai-jobs.js";

// ... existing code ...

/**
 * AI Chat Controller (RAG + SSE Streaming)
 * Handles conversational queries with real-time streaming response.
 */
export const aiChatController = async (req: Request, res: Response) => {
  const { query, history = [], stream = false, contentId } = req.body;
  const userId = req.userId;

  console.log("[CHAT_QUERY] Proxying to Python Agent Service", query);

  try {
    if (!query) {
      return res.status(400).json({ success: false, error: "Query is required." });
    }

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      // Issue 7 FIX: Prevent Nginx from buffering the SSE stream
      res.setHeader("X-Accel-Buffering", "no");
    }

    // Proxy the request to the Python microservice
    const pythonAgentUrl = process.env.PYTHON_AGENT_URL || "http://127.0.0.1:8000/chat";

    // Issue 8 FIX: Add a 65-second AbortController timeout.
    // Without this, a slow/hung Python agent would freeze Node forever.
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 65000);

    const response = await fetch(pythonAgentUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        history,
        userId: userId?.toString()
      }),
      signal: abortController.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Python Agent responded with ${response.status}`);
    }

    if (stream) {
      if (response.body) {
        // Read the web stream and pipe to express response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
        res.end();
      } else {
        res.write(`data: ${JSON.stringify({ type: "error", message: "Agent stream empty." })}\n\n`);
        return res.end();
      }
    } else {
      // Non-streaming fallback
      const data = await response.text();
      return res.status(200).json({ success: true, answer: data, sources: [] });
    }

  } catch (error: any) {
    console.error("[CHAT_CRITICAL_FAILURE]", error);
    if (stream) {
      res.write(`data: ${JSON.stringify({ type: "error", message: "Python Agent temporarily unavailable." })}\n\n`);
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
    
    const user = await UserModel.findById(req.userId);
    const classification = await getAiClassification(url, "quick", {
      userId: req.userId,
      aiPrefs: user?.aiPreferences
    });

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
