import type { Request, Response } from "express";
import { ContentModel } from "../db.js";
import mongoose from "mongoose";

export const getConnectionsController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // 1. Get the current content's embedding
    const content = await ContentModel.findOne({ _id: id, userId }).select("+embedding");
    
    if (!content || !content.embedding || content.embedding.length === 0) {
      return res.json({ connections: [] });
    }

    // 2. Perform Vector Search to find the top 3 similar notes
    let connections: any[] = [];
    try {
      try {
        connections = await ContentModel.aggregate([
          {
            "$vectorSearch": {
              "index": "vector_index",
              "path": "embedding",
              "queryVector": content.embedding,
              "numCandidates": 50,
              "limit": 5,
              "filter": { "userId": { "$eq": new mongoose.Types.ObjectId(userId) } }
            }
          },
          {
            "$match": { 
              "userId": new mongoose.Types.ObjectId(userId),
              "_id": { "$ne": new mongoose.Types.ObjectId(id) } // Don't include itself
            }
          },
          {
            "$limit": 3
          },
          {
            "$project": {
              "title": 1,
              "link": 1,
              "type": 1,
              "similarity": { "$meta": "vectorSearchScore" }
            }
          }
        ]);
      } catch (filterError) {
        // Fallback if filter field is not indexed in Atlas vector_index
        connections = await ContentModel.aggregate([
          {
            "$vectorSearch": {
              "index": "vector_index",
              "path": "embedding",
              "queryVector": content.embedding,
              "numCandidates": 50,
              "limit": 20
            }
          },
          {
            "$match": { 
              "userId": new mongoose.Types.ObjectId(userId),
              "_id": { "$ne": new mongoose.Types.ObjectId(id) }
            }
          },
          {
            "$limit": 3
          },
          {
            "$project": {
              "title": 1,
              "link": 1,
              "type": 1,
              "similarity": { "$meta": "vectorSearchScore" }
            }
          }
        ]);
      }
    } catch (vectorSearchError) {
      console.warn("Connections vector search unavailable, falling back to tag/recent items");
      connections = await ContentModel.find({
        userId,
        _id: { $ne: id }
      })
        .select("title link type")
        .limit(3)
        .lean();
    }

    res.json({ connections });
  } catch (error) {
    console.error("Connections Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
