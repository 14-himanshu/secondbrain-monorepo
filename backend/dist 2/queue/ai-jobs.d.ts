import { Worker, type Job } from "bullmq";
export declare const AI_INGESTION_QUEUE = "ai-ingestion";
export type AiIngestionJob = {
    contentId: string;
    normalizedLink: string;
    trigger: "create" | "reprocess" | "recovery";
};
export declare const buildJobId: (contentId: string, normalizedLink: string) => string;
export declare const enqueueAiIngestionJob: (payload: AiIngestionJob) => Promise<{
    enqueued: false;
    jobId: null;
} | {
    enqueued: true;
    jobId: string;
}>;
export declare const createAiWorker: (processor: (job: Job<AiIngestionJob>) => Promise<void>) => Worker<AiIngestionJob, any, string> | null;
export declare const getAiQueueMetrics: () => Promise<{
    enabled: boolean;
} | {
    queueDepth: number;
    enabled: boolean;
}>;
export declare const initQueueObservers: () => Promise<void>;
//# sourceMappingURL=ai-jobs.d.ts.map