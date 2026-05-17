export const CONTENT_TYPES = ["video", "post", "document"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const EMBEDDING_STATUSES = ["pending", "completed", "failed"] as const;
export type EmbeddingStatus = (typeof EMBEDDING_STATUSES)[number];

export const AI_STATUSES = [
  "queued",
  "processing",
  "scraping",
  "analyzing",
  "summarized",
  "needs_manual_content",
  "completed",
  "failed",
] as const;
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
    ingestionStatus?: "ready" | "manual_content_required";
    ingestionReason?: string;
    summarizationSkipped?: boolean;
  };
  aiError?: string;
}

export interface ValidationIssue {
  path: (string | number)[];
  message: string;
}
