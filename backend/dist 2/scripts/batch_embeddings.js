/**
 * Batch Embedding Script
 * Generates and saves embeddings for all content documents that are missing them.
 * Run this once to ensure the RAG pipeline has data to retrieve.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { ContentModel } from "../db.js";
import { createEmbedding } from "../services/ai.service.js";
async function batchGenerateEmbeddings() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("[DB_CONNECTED]");
    const pending = await ContentModel.find({
        $or: [
            { embedding: { $exists: false } },
            { embedding: { $size: 0 } },
            { embeddingStatus: { $in: ["pending", "failed"] } }
        ]
    }).select("_id title description topics");
    console.log("[PENDING_DOCUMENTS]", pending.length);
    let success = 0, failed = 0;
    for (const doc of pending) {
        try {
            const contextText = [
                `Title: ${doc.title}`,
                doc.description ? `Description: ${doc.description}` : "",
                doc.topics?.length ? `Topics: ${doc.topics.join(", ")}` : ""
            ].filter(Boolean).join(". ");
            const embedding = await createEmbedding(contextText, false);
            await ContentModel.updateOne({ _id: doc._id }, { embedding, embeddingStatus: "completed" });
            console.log(`[OK] ${doc._id} — ${doc.title}`);
            success++;
        }
        catch (err) {
            console.error(`[FAIL] ${doc._id} — ${err.message}`);
            await ContentModel.updateOne({ _id: doc._id }, { embeddingStatus: "failed" });
            failed++;
        }
    }
    console.log(`[BATCH_COMPLETE] Success: ${success}, Failed: ${failed}`);
    await mongoose.disconnect();
}
batchGenerateEmbeddings();
//# sourceMappingURL=batch_embeddings.js.map