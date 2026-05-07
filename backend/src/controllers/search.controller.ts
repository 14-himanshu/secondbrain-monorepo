import type { Request, Response } from "express";
import { ContentModel } from "../db.js";
import { createEmbedding } from "../services/ai.service.js";
import { cosineSimilarity } from "../utils.js";

export const semanticSearchController = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const userId = req.userId;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // 1. Generate embedding for the query (with caching enabled)
    const queryEmbedding = await createEmbedding(query, true);

    // 2. Fetch only completed embeddings for this user
    // We explicitly select '+embedding' because it's marked as 'select: false' in schema
    const contents = await ContentModel.find({
      userId,
      embeddingStatus: "completed"
    }).select("+embedding");

    // 3. Calculate similarities
    const results = contents
      .map((content) => {
        const similarity = cosineSimilarity(queryEmbedding, content.embedding || []);
        return {
          ...content.toObject(),
          similarity
        };
      })
      // 4. Filter by threshold (optional) and sort
      .filter(item => item.similarity > 0.3) // Adjust threshold as needed
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 20); // Return top 20

    res.json({ results });
  } catch (error) {
    console.error("Semantic Search Error:", error);
    res.status(500).json({ message: "Internal server error during semantic search" });
  }
};
