import cron from "node-cron";
import { ContentModel } from "./db.js";
import { enqueueAiIngestionJob } from "./queue/ai-jobs.js";

export const initCronJobs = () => {
  // Run every 2 minutes
  cron.schedule("*/2 * * * *", async () => {
    console.log("[CRON][AUTO_WAKEUP] Checking for stuck or queued content...");

    try {
      // Find content stuck in 'queued' or 'processing' for more than 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const stuckContent = await ContentModel.find({
        aiStatus: { $in: ["queued", "processing"] },
        updatedAt: { $lt: fiveMinutesAgo }
      });

      if (stuckContent.length === 0) {
        return;
      }

      console.log(`[CRON][WAKEUP] Found ${stuckContent.length} potentially stuck items.`);

      for (const content of stuckContent) {
        const contentId = String(content._id);
        const normalizedLink = content.normalizedLink || content.link || "";
        if (!normalizedLink) continue;

        const currentAttempts = (content.aiMetadata as any)?.recoveryAttempts || 0;
        if (currentAttempts >= 3) {
          console.warn(`[CRON][ABANDON] Content ${contentId} failed recovery 3 times. Marking failed.`);
          await ContentModel.updateOne(
            { _id: contentId },
            { 
              $set: { 
                aiStatus: "failed", 
                aiError: "Processing timed out after 3 recovery attempts." 
              } 
            }
          );
          continue;
        }

        await ContentModel.updateOne(
          { _id: contentId },
          { 
            $set: { 
              aiStatus: "queued",
              "aiMetadata.recoveryAttempts": currentAttempts + 1 
            } 
          }
        );

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
