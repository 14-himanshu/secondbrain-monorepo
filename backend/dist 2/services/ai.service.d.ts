import type { ClassificationMode } from "./ingestion/types.js";
export declare enum AIErrorCode {
    RATE_LIMIT = "AI_RATE_LIMIT",
    CONTEXT_FAILURE = "AI_CONTEXT_FAILURE",
    SYNTHESIS_ERROR = "AI_SYNTHESIS_ERROR",
    EMBEDDING_FAILURE = "AI_EMBEDDING_FAILURE",
    TIMEOUT = "AI_TIMEOUT"
}
export declare class AIError extends Error {
    code: AIErrorCode;
    retryable: boolean;
    constructor(code: AIErrorCode, message: string, retryable?: boolean);
}
export declare const aiMetrics: {
    totalRequests: number;
    failedRequests: number;
    totalTokens: number;
    avgLatency: number;
    lastError: string | null;
};
interface AiMetadataSnapshot {
    domain?: string | undefined;
    source?: string | undefined;
    contentType?: string | undefined;
    estimatedTopics?: string[] | undefined;
    normalizedLink?: string | undefined;
    platform?: string | undefined;
    extractionSource?: string | undefined;
    extractionConfidence?: number | undefined;
    validationPassed?: boolean | undefined;
    cacheEligible?: boolean | undefined;
    transcriptAvailable?: boolean | undefined;
    author?: string | undefined;
    channel?: string | undefined;
    durationSeconds?: number | undefined;
    sourceType?: string | undefined;
    extractionQuality?: string | undefined;
    extractionWordCount?: number | undefined;
    ingestionStatus?: "ready" | "manual_content_required";
    ingestionReason?: string | undefined;
    summarizationSkipped?: boolean | undefined;
}
export interface AiClassification {
    title: string;
    description: string;
    type: "post" | "video" | "document";
    tags: string[];
    topics: string[];
    normalizedLink?: string;
    ingestionStatus?: "ready" | "manual_content_required";
    ingestionReason?: string;
    aiMetadata?: AiMetadataSnapshot;
}
/**
 * AI Classification Service
 * Handles metadata extraction and content categorization.
 * Supports 'quick' (latency-optimized) and 'deep' (insight-optimized) modes.
 */
import type { ExtractContext } from "./ingestion/types.js";
export declare const getAiClassification: (url: string, mode?: ClassificationMode, context?: ExtractContext) => Promise<AiClassification | {
    title: string | null | undefined;
    description: string | null | undefined;
    tags: string[];
    topics: string[];
    type: "video" | "post" | "document" | null | undefined;
    normalizedLink: string;
    aiMetadata: {
        estimatedTopics: string[];
        normalizedLink?: string | null;
        domain?: string | null;
        source?: string | null;
        contentType?: string | null;
        platform?: string | null;
        extractionSource?: string | null;
        extractionConfidence?: number | null;
        validationPassed?: boolean | null;
        cacheEligible?: boolean | null;
        sourceType?: string | null;
        extractionQuality?: string | null;
        extractionWordCount?: number | null;
        ingestionStatus?: string | null;
        ingestionReason?: string | null;
        summarizationSkipped?: boolean | null;
        transcriptAvailable?: boolean | null;
        author?: string | null;
        channel?: string | null;
        durationSeconds?: number | null;
    } | null | undefined;
    ingestionStatus?: never;
    ingestionReason?: never;
} | {
    title: string;
    description: string;
    type: "video" | "post" | "document";
    tags: string[];
    topics: string[];
    ingestionStatus: string;
    normalizedLink: string;
    aiMetadata: AiMetadataSnapshot;
    ingestionReason?: never;
} | {
    title: string;
    description: string;
    type: "post";
    tags: string[];
    topics: never[];
    ingestionStatus: string;
    ingestionReason: string;
    aiMetadata: {
        extractionSource: string;
        extractionConfidence: number;
        validationPassed: boolean;
        cacheEligible: boolean;
        extractionQuality: string;
        extractionWordCount: number;
        ingestionStatus: string;
        ingestionReason: string;
        summarizationSkipped: boolean;
    };
    normalizedLink?: never;
}>;
/**
 * Robust Embedding Service
 * Uses local extractor for embeddings.
 */
export declare const createEmbedding: (text: string, useCache?: boolean) => Promise<number[]>;
export declare const processContentEmbedding: (contentId: string) => Promise<void>;
/**
 * RAG Chat Engine (Production Grade - Non Streaming)
 * Generates grounded answers with full factual consistency.
 */
export declare const generateAiChatAnswer: (query: string, context: any[], history?: {
    role: "user" | "assistant";
    content: string;
}[]) => Promise<string>;
/**
 * RAG Chat Engine (Production Grade - Streaming)
 */
export declare const generateAiChatAnswerStream: (query: string, context: any[], history: {
    role: "user" | "assistant";
    content: string;
}[] | undefined, onChunk: (chunk: string) => void) => Promise<void>;
/**
 * Brain Intelligence Engine (Production Grade)
 * Implements deterministic analytics + semantic clustering + LLM synthesis.
 */
interface Cluster {
    name: string;
    count: number;
    confidence?: number;
    sources: {
        title: string;
        id: string;
        link: string;
    }[];
}
/**
 * Semantic Clustering Engine
 * Groups related memories based on vector similarity.
 * Greedy algorithm: O(N) complexity for low-latency dashboard loads.
 */
export declare const generateSemanticClusters: (contents: any[]) => Promise<Cluster[]>;
export declare const generateBrainIntelligence: (userId: string, contents: any[], deterministicData: any) => Promise<any>;
/**
 * Deterministic Analytics Engine
 * Uses MongoDB aggregations to generate high-fidelity structural data.
 */
export declare const getDeterministicAnalytics: (userId: string) => Promise<{
    contentDistribution: any[];
    topTags: any[];
    topDomains: any[];
    temporalShifts: {
        emerging: any[];
        declining: any[];
        consistencyScore: number;
    };
    activityTrend: any[];
}>;
export {};
//# sourceMappingURL=ai.service.d.ts.map