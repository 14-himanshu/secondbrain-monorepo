export declare const CONTENT_TYPES: readonly ["video", "post", "document"];
export type ContentType = (typeof CONTENT_TYPES)[number];
export declare const EMBEDDING_STATUSES: readonly ["pending", "completed", "failed"];
export type EmbeddingStatus = (typeof EMBEDDING_STATUSES)[number];
export declare const INGESTION_STATUSES: readonly ["full_extraction", "partial_extraction", "metadata_only", "authentication_required", "unsupported", "failed"];
export type IngestionStatus = (typeof INGESTION_STATUSES)[number];
export declare const AI_STATUSES: readonly ["unprocessed", "queued", "processing", "scraping", "analyzing", "summarized", "needs_manual_content", "completed", "failed"];
export type AiStatus = (typeof AI_STATUSES)[number];
export type ShareType = "private" | "link" | "public";
export interface ContentDto {
    _id: string;
    title: string;
    link: string;
    type: ContentType | string;
    tags?: string[];
    topics?: string[];
    userId: string;
    description?: string;
    embeddingStatus?: EmbeddingStatus;
    aiStatus?: AiStatus;
    aiMetadata?: {
        domain?: string;
        source?: string;
        contentType?: string;
        estimatedTopics?: string[];
        sourceType?: string;
        extractionQuality?: string;
        extractionWordCount?: number;
        ingestionStatus?: IngestionStatus;
        ingestionReason?: string;
        summarizationSkipped?: boolean;
        acquisitionMethod?: string;
        accessRequirement?: "public" | "authenticated";
    };
    aiError?: string;
}
export interface ValidationIssue {
    path: (string | number)[];
    message: string;
}
//# sourceMappingURL=index.d.ts.map