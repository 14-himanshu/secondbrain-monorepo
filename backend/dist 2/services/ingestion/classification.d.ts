import type { BackendContentType, ClassificationMode, ExtractedContent } from "./types.js";
export declare const toBackendType: (contentType: BackendContentType) => BackendContentType;
export declare const deriveDeterministicTags: (extraction: ExtractedContent) => string[];
export declare const deriveCategory: (extraction: ExtractedContent) => "Entertainment" | "News" | "Research" | "Other";
export declare const deriveTopics: (tags: string[], category?: string) => string[];
export declare const buildDeterministicDescription: (extraction: ExtractedContent) => string;
export declare const shouldUseAiSynthesis: (extraction: ExtractedContent, mode: ClassificationMode) => boolean;
export declare const truncateForSynthesis: (content: string, maxChars?: number) => string;
//# sourceMappingURL=classification.d.ts.map