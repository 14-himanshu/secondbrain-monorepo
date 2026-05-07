import mongoose from "mongoose";
import "dotenv/config";
import { connectToDatabase, ContentModel } from "../db.js";
import { processContentEmbedding } from "../services/ai.service.js";

async function migrate() {
    console.log("Starting embedding migration...");
    await connectToDatabase();

    const pendingContent = await ContentModel.find({
        $or: [
            { embedding: { $exists: false } },
            { embeddingStatus: { $ne: "completed" } }
        ]
    });

    console.log(`Found ${pendingContent.length} items to process.`);

    for (const content of pendingContent) {
        console.log(`Processing: ${content.title} (${content._id})`);
        // In migration we await to avoid overwhelming the API
        await processContentEmbedding((content._id as any).toString());
    }

    console.log("Migration complete!");
    process.exit(0);
}

migrate().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
