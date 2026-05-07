import type { Request, Response } from "express";
import { getAiClassification, processContentEmbedding, generateAiChatAnswerStream, createEmbedding } from "../services/ai.service.js";
import { cosineSimilarity } from "../utils.js";
import { ContentModel } from "../db.js";
import { z } from "zod";

// ... existing code ...

/**
 * AI Chat Controller (RAG + SSE Streaming)
 * Handles conversational queries with real-time streaming response.
 */
export const aiChatController = async (req: Request, res: Response) => {
  try {
    const { query, history = [] } = req.body;
    const userId = req.userId;

    if (!query) {
      return res.status(400).json({ success: false, message: "Query is required." });
    }

    // 1. Generate Query Embedding
    const queryEmbedding = await createEmbedding(query, true);

    // 2. Retrieve Relevant Context (Top 8 for Production RAG)
    const contents = await ContentModel.find({
      userId,
      embeddingStatus: "completed"
    }).select("+embedding");

    const topContext = contents
      .map((c) => ({
        content: c,
        similarity: cosineSimilarity(queryEmbedding, c.embedding || [])
      }))
      .filter(item => item.similarity > 0.25) // Threshold for relevance
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 8)
      .map(item => item.content);

    // 3. Setup SSE for Streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Send Sources Immediately
    const sources = topContext.map(c => ({
      _id: c._id,
      title: c.title,
      link: c.link,
      type: c.type
    }));
    
    res.write(`data: ${JSON.stringify({ type: "sources", sources })}\n\n`);

    if (topContext.length === 0) {
      res.write(`data: ${JSON.stringify({ type: "content", text: "I couldn't find any relevant notes in your brain to answer this." })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      return res.end();
    }

    // 4. Stream AI Answer
    await generateAiChatAnswerStream(query, topContext, history, (chunk) => {
      res.write(`data: ${JSON.stringify({ type: "content", text: chunk })}\n\n`);
    });

    res.write(`data: [DONE]\n\n`);
    res.end();

  } catch (error: any) {
    console.error(`[AI_CHAT_STREAM_FAILURE]: ${error.message}`);
    // If headers already sent, we can't send a JSON error
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Failed to process chat request." });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", message: "Stream interrupted." })}\n\n`);
      res.end();
    }
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
    const classification = await getAiClassification(url);

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
      return res.status(404).json({ success: false, message: "Content not found or unauthorized." });
    }

    // STEP 1: Quick Mode Sync Analysis (Instant Feedback)
    const link = content.link || "";
    const quickInsight = await getAiClassification(link, "quick");
    
    // Update DB with quick results immediately
    await ContentModel.updateOne({ _id: contentId }, { 
      title: quickInsight.title || content.title,
      description: quickInsight.description,
      tags: quickInsight.tags,
      aiStatus: "processing" 
    });

    // STEP 2: Offload Deep Analysis to Background
    (async () => {
       try {
         const deepInsight = await getAiClassification(link, "deep");
         
         await ContentModel.updateOne({ _id: contentId }, {
            tags: deepInsight.tags,
            topics: deepInsight.topics,
            description: deepInsight.description,
            title: deepInsight.title || quickInsight.title || content.title,
            aiStatus: "summarized"
         });
         
         await processContentEmbedding(contentId);
         
         await ContentModel.updateOne({ _id: contentId }, { aiStatus: "completed" });
       } catch (err: any) {
         console.error(`[BACKGROUND_REPROCESS_FAILED]: ${contentId}`, err);
         await ContentModel.updateOne({ _id: contentId }, { 
           embeddingStatus: "failed",
           aiStatus: "failed",
           aiError: err.message
         });
       }
    })();

    res.json({
      success: true,
      message: "Initial synthesis complete. Deep analysis running in background.",
      data: quickInsight
    });

  } catch (error: any) {
    console.error(`[REPROCESS_CONTROLLER_FAILURE]: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to start analysis." });
  }
};
