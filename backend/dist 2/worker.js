import { connectToDatabase } from "./db.js";
import { processContentEmbedding } from "./services/ai.service.js";
import { createAiWorker } from "./queue/ai-jobs.js";
const startWorker = async () => {
    await connectToDatabase();
    const worker = createAiWorker(async (job) => {
        const startedAt = Date.now();
        console.log("[WORKER][START]", {
            jobId: job.id,
            contentId: job.data.contentId,
            trigger: job.data.trigger,
        });
        await processContentEmbedding(job.data.contentId);
        console.log("[WORKER][DONE]", {
            jobId: job.id,
            contentId: job.data.contentId,
            durationMs: Date.now() - startedAt,
        });
    });
    if (!worker) {
        console.error("AI worker not started: REDIS_URL is not configured");
        process.exit(1);
    }
    await worker.waitUntilReady();
    console.log("AI worker is running");
    const shutdown = async () => {
        await worker.close();
        process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
};
startWorker().catch((error) => {
    console.error("Failed to start AI worker");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
//# sourceMappingURL=worker.js.map