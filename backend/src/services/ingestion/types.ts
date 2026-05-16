export type Platform = "youtube" | "medium" | "reddit" | "twitter" | "generic";

export type ExtractionSource =
  | "youtube-transcript"
  | "youtube-metadata"
  | "reddit-json"
  | "twitter-metadata"
  | "readability"
  | "metadata"
  | "body-fallback"
  | "unavailable";

export type BackendContentType = "video" | "post" | "document";

export type ClassificationMode = "quick" | "deep";

export interface UrlTarget {
  rawUrl: string;
  normalizedUrl: string;
  cacheKey: string;
  platform: Platform;
  url: URL;
  videoId?: string | undefined;
}

export interface StructuredMetadata {
  title?: string | undefined;
  description?: string | undefined;
  excerpt?: string | undefined;
  author?: string | undefined;
  channel?: string | undefined;
  tags: string[];
  durationSeconds?: number | undefined;
  siteName?: string | undefined;
  canonicalUrl?: string | undefined;
  publishedTime?: string | undefined;
  contentType?: string | undefined;
}

export interface ExtractionValidation {
  passed: boolean;
  issues: string[];
  score: number;
  wordCount: number;
}

export interface ExtractedContent {
  platform: Platform;
  normalizedUrl: string;
  source: ExtractionSource;
  confidence: number;
  cacheable: boolean;
  content: string;
  metadata: StructuredMetadata;
  validation: ExtractionValidation;
  contentType: BackendContentType;
}
