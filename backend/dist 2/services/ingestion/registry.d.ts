import type { ClassificationMode, ExtractedContent, UrlTarget, ExtractContext } from "./types.js";
export declare const extractContentFromUrl: (rawUrl: string, mode?: ClassificationMode, context?: ExtractContext) => Promise<{
    target: UrlTarget;
    extraction: ExtractedContent;
}>;
//# sourceMappingURL=registry.d.ts.map