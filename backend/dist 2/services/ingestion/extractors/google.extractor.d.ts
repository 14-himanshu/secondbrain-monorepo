import type { UrlTarget, ClassificationMode, ExtractedContent, ExtractContext } from "../types.js";
export declare const parseGoogleFileId: (url: URL) => string | null;
export declare const extractGoogleContent: (target: UrlTarget, mode?: ClassificationMode, context?: ExtractContext) => Promise<ExtractedContent>;
//# sourceMappingURL=google.extractor.d.ts.map