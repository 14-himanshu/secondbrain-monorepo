import cron from "node-cron";
import { ContentModel } from "./db.js";
import { enqueueAiIngestionJob } from "./queue/ai-jobs.js";

export const initCronJobs = () => {
  // Run every 2 minutes
  cron.schedule("*/2 * * * *", async () => {
    console.log("[CRON][AUTO_WAKEUP] Checking for stuck or queued content...");

    try {
      // Find content stuck in 'pending' or 'queued' for more than 2 minutes
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

      const stuckContent = await ContentModel.find({
        aiStatus: { $in: ["queued", "processing"] },
        updatedAt: { $lt: twoMinutesAgo }
      });

      if (stuckContent.length === 0) {
        return;
      }

      console.log(`[CRON][WAKEUP] Triggering ${stuckContent.length} items.`);

      for (const content of stuckContent) {
        const contentId = String(content._id);
        const normalizedLink = content.normalizedLink || content.link || "";
        if (!normalizedLink) continue;
        await enqueueAiIngestionJob({
          contentId,
          normalizedLink,
          trigger: "recovery",
        });
      }

    } catch (error) {
      console.error("Error in embedding cleanup cron job:", error);
    }
  });

  console.log("Cron jobs initialized.");
};
