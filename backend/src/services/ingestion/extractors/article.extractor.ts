import { Readability } from "@mozilla/readability";
import { createDom, extractBodyText, extractStructuredMetadata, fetchTextResponse, mergeStructuredMetadata, normalizeWhitespace } from "../html.js";
import { adjustConfidence, assessExtractionQuality } from "../validation.js";
import type { ClassificationMode, ExtractedContent, UrlTarget } from "../types.js";

const buildMetadataContent = (title?: string, description?: string, excerpt?: string) =>
  normalizeWhitespace([title, description, excerpt].filter(Boolean).join(". "));

export const extractArticleContent = async (
  target: UrlTarget,
  mode: ClassificationMode = "deep"
): Promise<ExtractedContent> => {
  try {
    const fetched = await fetchTextResponse(target.normalizedUrl, 12000);

    if (fetched.contentType.includes("application/pdf") || target.url.pathname.toLowerCase().endsWith(".pdf")) {
      const metadataContent = buildMetadataContent(undefined, "PDF document", undefined);
      const validation = assessExtractionQuality(metadataContent, "metadata", target.platform);

      return {
        platform: target.platform,
        normalizedUrl: target.normalizedUrl,
        source: "metadata",
        confidence: adjustConfidence(0.6, validation),
        cacheable: false,
        content: metadataContent,
        metadata: {
          title: target.url.pathname.split("/").filter(Boolean).pop() || "Document",
          description: "PDF document",
          tags: ["pdf", "document"],
          contentType: "document",
        },
        validation,
        contentType: "document",
      };
    }

    const dom = createDom(fetched.body, fetched.finalUrl);
    const metadata = extractStructuredMetadata(dom.window.document);

    const readable = new Readability(dom.window.document.cloneNode(true) as Document).parse();
    const readabilityText = normalizeWhitespace(readable?.textContent || "");
    const mergedMetadata = mergeStructuredMetadata(metadata, {
      title: readable?.title || undefined,
      excerpt: readable?.excerpt || undefined,
      author: readable?.byline || undefined,
    });
    const inferredContentType = "post" as const;

    const metadataContent = buildMetadataContent(mergedMetadata.title, mergedMetadata.description, mergedMetadata.excerpt);
    if (mode === "quick" && metadataContent) {
      const validation = assessExtractionQuality(metadataContent, "metadata", target.platform);
      return {
        platform: target.platform,
        normalizedUrl: target.normalizedUrl,
        source: "metadata",
        confidence: adjustConfidence(0.55, validation),
        cacheable: false,
        content: metadataContent,
        metadata: mergedMetadata,
        validation,
        contentType: inferredContentType,
      };
    }

    if (readabilityText) {
      const validation = assessExtractionQuality(readabilityText, "readability", target.platform);
      if (validation.passed) {
        return {
          platform: target.platform,
          normalizedUrl: target.normalizedUrl,
          source: "readability",
          confidence: adjustConfidence(0.85, validation),
          cacheable: true,
          content: readabilityText,
          metadata: mergedMetadata,
          validation,
          contentType: inferredContentType,
        };
      }
    }

    if (metadataContent) {
      const validation = assessExtractionQuality(metadataContent, "metadata", target.platform);
      return {
        platform: target.platform,
        normalizedUrl: target.normalizedUrl,
        source: "metadata",
        confidence: adjustConfidence(0.55, validation),
        cacheable: false,
        content: metadataContent,
        metadata: mergedMetadata,
        validation,
        contentType: inferredContentType,
      };
    }

    const bodyText = extractBodyText(dom.window.document);
    const validation = assessExtractionQuality(bodyText, "body-fallback", target.platform);

    return {
      platform: target.platform,
      normalizedUrl: target.normalizedUrl,
      source: bodyText ? "body-fallback" : "unavailable",
      confidence: bodyText ? adjustConfidence(0.25, validation) : 0.05,
      cacheable: false,
      content: bodyText,
      metadata: mergedMetadata,
      validation,
      contentType: inferredContentType,
    };
  } catch (error) {
    const validation = assessExtractionQuality("", "unavailable", target.platform);
    return {
      platform: target.platform,
      normalizedUrl: target.normalizedUrl,
      source: "unavailable",
      confidence: 0.05,
      cacheable: false,
      content: "",
      metadata: { title: undefined, description: undefined, tags: [] },
      validation,
      contentType: "post",
    };
  }
};
