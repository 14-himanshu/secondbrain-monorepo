import "dotenv/config";
import mongoose from "mongoose";
import { ContentModel } from "../db.js";
import { createEmbedding } from "../services/ai.service.js";

async function verifyVectorSearch() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("[DB_CONNECTED]");

    // 1. Verify embeddings exist
    const count = await ContentModel.countDocuments({ embedding: { $exists: true, $ne: [] } });
    console.log("[EMBEDDING_COUNT]", count);

    if (count === 0) {
      console.warn("[WARNING] No embeddings found in database. Vector search will return empty.");
    }

    // 2. Sample Dimension Check
    const sample = await ContentModel.findOne({ embedding: { $exists: true, $ne: [] } }).select("+embedding");
    if (sample && sample.embedding) {
      console.log("[SAMPLE_DOCUMENT_TITLE]", sample.title);
      console.log("[EMBEDDING_DIMENSIONS]", sample.embedding.length);
    }

    // 3. Test Vector Search
    const testQuery = "AI and machine learning";
    console.log("[GENERATING_TEST_EMBEDDING] Query:", testQuery);
    const queryEmbedding = await createEmbedding(testQuery, false);
    console.log("[QUERY_EMBEDDING_DIMENSIONS]", queryEmbedding.length);

    console.log("[VECTOR_SEARCH_START]");
    try {
      const results = await ContentModel.aggregate([
        {
          $vectorSearch: {
            index: "vector_index",
            path: "embedding",
            queryVector: queryEmbedding,
            numCandidates: 50,
            limit: 5
          }
        },
        {
          $project: {
            title: 1,
            similarity: { $meta: "vectorSearchScore" }
          }
        }
      ]);

      console.log("[VECTOR_MATCHES]", results.length);
      results.forEach((r, i) => console.log(`  Match ${i+1}: ${r.title} (Score: ${r.similarity})`));

    } catch (vError: any) {
      console.error("[VECTOR_SEARCH_FAILED]", vError.message);
      if (vError.message.includes("index")) {
        console.error("[CRITICAL] 'vector_index' not found. Please ensure it is created in MongoDB Atlas.");
      }
    }

    // 4. Test Tier 3: In-Memory Cosine Similarity
    console.log("[TIER_3_COSINE_TEST_START]");
    try {
      const { cosineSimilarity } = await import("../utils.js");
      const allDocs = await ContentModel.find({}).select("+embedding title").limit(200);
      const withEmb = allDocs.filter((d: any) => d.embedding?.length > 0);
      console.log("[DOCS_WITH_EMBEDDINGS]", withEmb.length);
      if (withEmb.length > 0) {
        const scored = withEmb.map((d: any) => ({
          title: d.title,
          score: cosineSimilarity(queryEmbedding, d.embedding)
        }));
        scored.sort((a: any, b: any) => b.score - a.score);
        console.log("[TIER_3_TOP_MATCH]", scored[0]?.title, "score:", scored[0]?.score?.toFixed(4));
      }
    } catch (cErr: any) {
      console.error("[TIER_3_COSINE_FAILED]", cErr.message);
    }

  } catch (error: any) {
    console.error("[VERIFICATION_FAILED]", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

verifyVectorSearch();
