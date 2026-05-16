import cron from "node-cron";
import { ContentModel } from "./db.js";
import { processContentEmbedding } from "./services/ai.service.js";

export const initCronJobs = () => {
  // Run every 2 minutes
  cron.schedule("*/2 * * * *", async () => {
    console.log("[CRON][AUTO_WAKEUP] Checking for stuck or queued content...");

    try {
      // Find content stuck in 'pending' or 'queued' for more than 2 minutes
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

      const stuckContent = await ContentModel.find({
        $or: [
          { embeddingStatus: "pending", updatedAt: { $lt: twoMinutesAgo } },
          { aiStatus: "queued" }
        ]
      });

      if (stuckContent.length === 0) {
        return;
      }

      console.log(`[CRON][WAKEUP] Triggering ${stuckContent.length} items.`);

      for (const content of stuckContent) {
        processContentEmbedding((content._id as any).toString()).catch(() => {});
      }

    } catch (error) {
      console.error("Error in embedding cleanup cron job:", error);
    }
  });

  console.log("Cron jobs initialized.");
};
