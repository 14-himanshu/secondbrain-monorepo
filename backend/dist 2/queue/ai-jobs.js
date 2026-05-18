import crypto from "crypto";
import { Queue, QueueEvents, Worker } from "bullmq";
import { getAiWorkerConcurrency } from "../config.js";
import { getQueueConnection, isQueueEnabled } from "./redis.js";
export const AI_INGESTION_QUEUE = "ai-ingestion";
let queue = null;
let queueEvents = null;
const getQueue = () => {
    if (!isQueueEnabled())
        return null;
    if (!queue) {
        const connection = getQueueConnection();
        if (!connection)
            return null;
        queue = new Queue(AI_INGESTION_QUEUE, { connection });
    }
    return queue;
};
const getQueueEvents = () => {
    if (!isQueueEnabled())
        return null;
    if (!queueEvents) {
        const connection = getQueueConnection();
        if (!connection)
            return null;
        queueEvents = new QueueEvents(AI_INGESTION_QUEUE, { connection });
    }
    return queueEvents;
};
const hash = (value) => crypto.createHash("sha1").update(value).digest("hex").slice(0, 16);
export const buildJobId = (contentId, normalizedLink) => `content:${contentId}:url:${hash(normalizedLink)}`;
export const enqueueAiIngestionJob = async (payload) => {
    const aiQueue = getQueue();
    if (!aiQueue) {
        return { enqueued: false, jobId: null };
    }
    const jobId = buildJobId(payload.contentId, payload.normalizedLink);
    await aiQueue.add("process-content", payload, {
        jobId,
        removeOnComplete: 500,
        removeOnFail: 1000,
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
    });
    return { enqueued: true, jobId };
};
export const createAiWorker = (processor) => {
    if (!isQueueEnabled())
        return null;
    const connection = getQueueConnection();
    if (!connection)
        return null;
    return new Worker(AI_INGESTION_QUEUE, processor, {
        connection,
        concurrency: Math.max(1, getAiWorkerConcurrency()),
        limiter: { max: 20, duration: 1000 },
    });
};
export const getAiQueueMetrics = async () => {
    const aiQueue = getQueue();
    if (!aiQueue) {
        return { enabled: false };
    }
    const [counts, waiting, delayed] = await Promise.all([
        aiQueue.getJobCounts("active", "completed", "delayed", "failed", "waiting"),
        aiQueue.getWaitingCount(),
        aiQueue.getDelayedCount(),
    ]);
    return {
        enabled: true,
        ...counts,
        queueDepth: waiting + delayed + (counts.active ?? 0),
    };
};
export const initQueueObservers = async () => {
    const events = getQueueEvents();
    if (!events)
        return;
    await events.waitUntilReady();
};
//# sourceMappingURL=ai-jobs.js.map