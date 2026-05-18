import { ContentModel } from "../db.js";
import { createEmbedding } from "../services/ai.service.js";
import mongoose from "mongoose";
export const semanticSearchController = async (req, res) => {
    try {
        const query = req.query.q;
        const userId = req.userId;
        if (!query) {
            return res.status(400).json({ message: "Search query is required" });
        }
        // 1. Generate embedding for the search query
        const queryEmbedding = await createEmbedding(query, true);
        let results = [];
        try {
            // 2. NATIVE VECTOR SEARCH (Fast & Professional)
            // This requires a Search Index named "vector_index" in Atlas
            results = await ContentModel.aggregate([
                {
                    "$vectorSearch": {
                        "index": "vector_index",
                        "path": "embedding",
                        "queryVector": queryEmbedding,
                        "numCandidates": 100,
                        "limit": 20
                    }
                },
                {
                    "$match": { "userId": new mongoose.Types.ObjectId(userId) }
                },
                {
                    "$project": {
                        "title": 1,
                        "link": 1,
                        "type": 1,
                        "description": 1,
                        "tags": 1,
                        "similarity": { "$meta": "vectorSearchScore" }
                    }
                }
            ]);
            console.log(`[AI][VECTOR_SEARCH_NATIVE] found=${results.length}`);
        }
        catch (vectorError) {
            // 3. STRICT FALLBACK: Atlas text index only (bounded)
            console.warn("[AI][VECTOR_SEARCH_FALLBACK] Index 'vector_index' unavailable. Using text search.");
            const textResults = await ContentModel.find({
                userId,
                $text: { $search: query },
            })
                .select("title link type description tags")
                .limit(20);
            results = textResults.map((content) => ({
                ...content.toObject(),
                similarity: 0,
            }));
        }
        res.json({ results });
    }
    catch (error) {
        console.error("Semantic Search Error:", error);
        res.status(500).json({ message: "Internal server error during semantic search" });
    }
};
//# sourceMappingURL=search.controller.js.map