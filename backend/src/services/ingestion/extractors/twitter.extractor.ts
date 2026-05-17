import { createDom, extractStructuredMetadata, fetchTextResponse, mergeStructuredMetadata, normalizeWhitespace } from "../html.js";
import { adjustConfidence, assessExtractionQuality, deriveExtractionQuality } from "../validation.js";
import type { ClassificationMode, ExtractedContent, UrlTarget } from "../types.js";

const extractHashtags = (value: string) =>
  Array.from(new Set((value.match(/#[a-z0-9_]+/gi) || []).map((tag) => tag.replace(/^#/, "").toLowerCase()))).slice(0, 8);

export const extractTwitterContent = async (
  target: UrlTarget,
  _mode: ClassificationMode = "deep"
): Promise<ExtractedContent> => {
  try {
    const fetched = await fetchTextResponse(target.normalizedUrl, 10000);
    const dom = createDom(fetched.body, fetched.finalUrl);
    const metadata = extractStructuredMetadata(dom.window.document);
    const tags = Array.from(new Set([...metadata.tags, ...extractHashtags(`${metadata.title || ""} ${metadata.description || ""}`)])).slice(0, 8);
    const mergedMetadata = mergeStructuredMetadata(metadata, { tags, contentType: "post" });
    const content = normalizeWhitespace([mergedMetadata.title, mergedMetadata.description].filter(Boolean).join(". "));
    const validation = assessExtractionQuality(content, "twitter-metadata", target.platform);

    return {
      platform: target.platform,
      normalizedUrl: target.normalizedUrl,
      source: content ? "twitter-metadata" : "unavailable",
      sourceType: "public_source",
      confidence: content ? adjustConfidence(0.72, validation) : 0.05,
      wordCount: validation.wordCount,
      extractionQuality: deriveExtractionQuality(validation, "public_source"),
      cacheable: validation.passed && content.length > 40,
      content,
      metadata: mergedMetadata,
      validation,
      contentType: "post",
    };
  } catch {
    const validation = assessExtractionQuality("", "unavailable", target.platform);
    return {
      platform: target.platform,
      normalizedUrl: target.normalizedUrl,
      source: "unavailable",
      sourceType: "public_source",
      confidence: 0.05,
      wordCount: validation.wordCount,
      extractionQuality: deriveExtractionQuality(validation, "public_source"),
      cacheable: false,
      content: "",
      metadata: { tags: [], contentType: "post" },
      validation,
      contentType: "post",
    };
  }
};
