import cron from "node-cron";
import { ContentModel } from "./db.js";
import { processContentEmbedding } from "./services/ai.service.js";

export const initCronJobs = () => {
  // Run every 30 minutes
  cron.schedule("*/30 * * * *", async () => {
    console.log("Running embedding cleanup cron job...");

    try {
      // Find content stuck in 'pending' for more than 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const stuckContent = await ContentModel.find({
        embeddingStatus: "pending",
        updatedAt: { $lt: fiveMinutesAgo }
      });

      if (stuckContent.length === 0) {
        console.log("No stuck content found.");
        return;
      }

      console.log(`Found ${stuckContent.length} stuck items. Retrying...`);

      for (const content of stuckContent) {
        // Fire and forget, the concurrency control in processContentEmbedding will handle duplicates
        processContentEmbedding((content._id as any).toString());
      }

    } catch (error) {
      console.error("Error in embedding cleanup cron job:", error);
    }
  });

  console.log("Cron jobs initialized.");
};
