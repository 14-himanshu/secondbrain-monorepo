import { Readability } from "@mozilla/readability";
import { createDom, extractBodyText, extractStructuredMetadata, fetchTextResponse, mergeStructuredMetadata, normalizeWhitespace } from "../html.js";
import { adjustConfidence, assessExtractionQuality, deriveExtractionQuality } from "../validation.js";
import type { ClassificationMode, ExtractedContent, UrlTarget } from "../types.js";

const buildMetadataContent = (title?: string, description?: string, excerpt?: string) =>
  normalizeWhitespace([title, description, excerpt].filter(Boolean).join(". "));

const PROTECTED_HOST_PATTERNS = ["notion.so", "notion.site"];
const LOGIN_WALL_MARKERS = [
  "sign in to continue",
  "log in to continue",
  "you do not have access",
  "this page is private",
  "login required",
  "authentication required",
  "request access",
];

export const extractArticleContent = async (
  target: UrlTarget,
  mode: ClassificationMode = "deep"
): Promise<ExtractedContent> => {
  const host = target.url.hostname.replace(/^www\./, "").toLowerCase();
  if (PROTECTED_HOST_PATTERNS.some((pattern) => host.includes(pattern))) {
    const validation = assessExtractionQuality("", "unavailable", target.platform);
    return {
      platform: target.platform,
      normalizedUrl: target.normalizedUrl,
      source: "unavailable",
      sourceType: "protected_source",
      confidence: 0.05,
      wordCount: validation.wordCount,
      extractionQuality: deriveExtractionQuality(validation, "protected_source"),
      cacheable: false,
      content: "",
      metadata: {
        title: target.url.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || "Protected page",
        description: "Protected source detected. Use connector or paste content manually.",
        tags: ["protected"],
        contentType: "document",
      },
      validation,
      contentType: "document",
    };
  }

  try {
    const fetched = await fetchTextResponse(target.normalizedUrl, 12000);
    const lowerBody = fetched.body.toLowerCase();
    const loginWallDetected = LOGIN_WALL_MARKERS.some((marker) => lowerBody.includes(marker));
    if (loginWallDetected) {
      const validation = assessExtractionQuality("", "unavailable", target.platform);
      return {
        platform: target.platform,
        normalizedUrl: target.normalizedUrl,
        source: "unavailable",
        sourceType: "protected_source",
        confidence: 0.05,
        wordCount: validation.wordCount,
        extractionQuality: deriveExtractionQuality(validation, "protected_source"),
        cacheable: false,
        content: "",
        metadata: {
          title: target.url.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || host,
          description: "This page appears login-protected. Provide manual content.",
          tags: ["protected"],
        },
        validation,
        contentType: "post",
      };
    }

    if (fetched.contentType.includes("application/pdf") || target.url.pathname.toLowerCase().endsWith(".pdf")) {
      const metadataContent = buildMetadataContent(undefined, "PDF document", undefined);
      const validation = assessExtractionQuality(metadataContent, "metadata", target.platform);

      return {
        platform: target.platform,
        normalizedUrl: target.normalizedUrl,
        source: "metadata",
        sourceType: "public_source",
        confidence: adjustConfidence(0.6, validation),
        wordCount: validation.wordCount,
        extractionQuality: deriveExtractionQuality(validation, "public_source"),
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
        sourceType: "public_source",
        confidence: adjustConfidence(0.55, validation),
        wordCount: validation.wordCount,
        extractionQuality: deriveExtractionQuality(validation, "public_source"),
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
          sourceType: "public_source",
          confidence: adjustConfidence(0.85, validation),
          wordCount: validation.wordCount,
          extractionQuality: deriveExtractionQuality(validation, "public_source"),
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
        sourceType: "public_source",
        confidence: adjustConfidence(0.55, validation),
        wordCount: validation.wordCount,
        extractionQuality: deriveExtractionQuality(validation, "public_source"),
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
      sourceType: "public_source",
      confidence: bodyText ? adjustConfidence(0.25, validation) : 0.05,
      wordCount: validation.wordCount,
      extractionQuality: deriveExtractionQuality(validation, "public_source"),
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
      sourceType: "public_source",
      confidence: 0.05,
      wordCount: validation.wordCount,
      extractionQuality: deriveExtractionQuality(validation, "public_source"),
      cacheable: false,
      content: "",
      metadata: { title: undefined, description: undefined, tags: [] },
      validation,
      contentType: "post",
    };
  }
};
