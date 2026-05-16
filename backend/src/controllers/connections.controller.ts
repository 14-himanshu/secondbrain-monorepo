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
    const connections = await ContentModel.aggregate([
      {
        "$vectorSearch": {
          "index": "vector_index",
          "path": "embedding",
          "queryVector": content.embedding,
          "numCandidates": 50,
          "limit": 4
        }
      },
      {
        "$match": { 
            "userId": new mongoose.Types.ObjectId(userId),
            "_id": { "$ne": new mongoose.Types.ObjectId(id) } // Don't include itself
        }
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

    res.json({ connections });
  } catch (error) {
    console.error("Connections Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
