import crypto from "crypto";
import { Queue, QueueEvents, Worker, type Job } from "bullmq";
import { getAiWorkerConcurrency } from "../config.js";
import { getQueueConnection, isQueueEnabled } from "./redis.js";

export const AI_INGESTION_QUEUE = "ai-ingestion";

export type AiIngestionJob = {
  contentId: string;
  normalizedLink: string;
  trigger: "create" | "reprocess" | "recovery";
};

let queue: Queue<AiIngestionJob> | null = null;
let queueEvents: QueueEvents | null = null;

const getQueue = () => {
  if (!isQueueEnabled()) return null;
  if (!queue) {
    const connection = getQueueConnection();
    if (!connection) return null;
    queue = new Queue<AiIngestionJob>(AI_INGESTION_QUEUE, { connection });
  }
  return queue;
};

const getQueueEvents = () => {
  if (!isQueueEnabled()) return null;
  if (!queueEvents) {
    const connection = getQueueConnection();
    if (!connection) return null;
    queueEvents = new QueueEvents(AI_INGESTION_QUEUE, { connection });
  }
  return queueEvents;
};

const hash = (value: string) =>
  crypto.createHash("sha1").update(value).digest("hex").slice(0, 16);

export const buildJobId = (contentId: string, normalizedLink: string) =>
  `content:${contentId}:url:${hash(normalizedLink)}`;

export const enqueueAiIngestionJob = async (payload: AiIngestionJob) => {
  const aiQueue = getQueue();

  if (!aiQueue) {
    return { enqueued: false as const, jobId: null };
  }

  const jobId = buildJobId(payload.contentId, payload.normalizedLink);
  try {
    await aiQueue.add("process-content", payload, {
      jobId,
      removeOnComplete: 500,
      removeOnFail: 1000,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    });
  } catch (error) {
    const err = error as Error;
    console.warn("[AI_QUEUE_ENQUEUE_FAILED]", err.message);
    return { enqueued: false as const, jobId: null };
  }

  return { enqueued: true as const, jobId };
};

export const createAiWorker = (
  processor: (job: Job<AiIngestionJob>) => Promise<void>
) => {
  if (!isQueueEnabled()) return null;
  const connection = getQueueConnection();
  if (!connection) return null;
  return new Worker<AiIngestionJob>(AI_INGESTION_QUEUE, processor, {
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
  if (!events) return;
  
  try {
    // Wait max 5 seconds for Redis to be ready
    await Promise.race([
      events.waitUntilReady(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Queue ready timeout')), 5000)
      )
    ]);
  } catch (err) {
    console.warn('[QUEUE] Failed to initialize observers:', (err as Error).message);
    // Continue anyway - queue is optional
  }
};
