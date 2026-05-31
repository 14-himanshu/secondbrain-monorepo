import { Readability } from "@mozilla/readability";
import * as pdfParse from "pdf-parse";
import { renderPageSnapshot } from "../browser.js";
import {
  createDom,
  extractBodyText,
  extractStructuredMetadata,
  fetchArrayBufferResponse,
  fetchTextResponse,
  mergeStructuredMetadata,
  normalizeWhitespace,
} from "../html.js";
import { adjustConfidence, assessExtractionQuality, deriveExtractionQuality, deriveIngestionStatus } from "../validation.js";
import type { ClassificationMode, ExtractedContent, UrlTarget } from "../types.js";

const buildMetadataContent = (title?: string, description?: string, excerpt?: string) =>
  normalizeWhitespace([title, description, excerpt].filter(Boolean).join(". "));

const PROTECTED_HOST_PATTERNS = ["notion.so", "notion.site", "app.notion.com"];
const LOGIN_WALL_MARKERS = [
  "sign in to continue",
  "log in to continue",
  "you do not have access",
  "this page is private",
  "login required",
  "authentication required",
  "request access",
];

const buildProtectedFallback = (
  target: UrlTarget,
  title: string,
  description: string
): ExtractedContent => {
  const validation = assessExtractionQuality("", "unavailable", target.platform);
  return {
    platform: target.platform,
    normalizedUrl: target.normalizedUrl,
    source: "unavailable",
    sourceType: "protected_source",
    ingestionStatus: "authentication_required",
    ingestionReason: "authentication_required",
    acquisitionMethod: "static_fetch",
    confidence: 0.05,
    wordCount: validation.wordCount,
    extractionQuality: deriveExtractionQuality(validation, "protected_source"),
    cacheable: false,
    content: "",
    metadata: {
      title,
      description,
      tags: ["protected"],
      contentType: "document",
    },
    validation,
    contentType: "document",
  };
};

export const extractArticleContent = async (
  target: UrlTarget,
  mode: ClassificationMode = "deep"
): Promise<ExtractedContent> => {
  const host = target.url.hostname.replace(/^www\./, "").toLowerCase();
  if (PROTECTED_HOST_PATTERNS.some((pattern) => host.includes(pattern))) {
    return buildProtectedFallback(
      target,
      target.url.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || "Protected page",
      "Protected source detected. Connect the provider to extract content."
    );
  }

  try {
    const isPdfUrl = target.url.pathname.toLowerCase().endsWith(".pdf");
    if (isPdfUrl) {
      const fetchedPdf = await fetchArrayBufferResponse(target.normalizedUrl, 15000);
      const pdfLib: any = (pdfParse as any).default || (pdfParse as any);
      const parsed = await pdfLib(Buffer.from(fetchedPdf.body));
      const pdfText = normalizeWhitespace(String(parsed.text || "")).slice(0, 40000);
      const validation = assessExtractionQuality(pdfText, "body-fallback", target.platform);
      const ingestionStatus = deriveIngestionStatus("body-fallback", validation, "public_source");
      if (pdfText) {
        return {
          platform: target.platform,
          normalizedUrl: target.normalizedUrl,
          source: "body-fallback",
          sourceType: "public_source",
          ingestionStatus,
          ingestionReason: ingestionStatus === "partial_extraction" ? "limited_pdf_text" : undefined,
          acquisitionMethod: "file_download",
          confidence: adjustConfidence(0.84, validation),
          wordCount: validation.wordCount,
          extractionQuality: deriveExtractionQuality(validation, "public_source"),
          cacheable: validation.passed,
          content: pdfText,
          metadata: {
            title: target.url.pathname.split("/").filter(Boolean).pop() || "PDF document",
            description: pdfText.slice(0, 500),
            tags: ["pdf", "document"],
            contentType: "document",
          },
          validation,
          contentType: "document",
        };
      }
    }

    const fetched = await fetchTextResponse(target.normalizedUrl, 12000);
    const lowerBody = fetched.body.toLowerCase();
    const loginWallDetected = LOGIN_WALL_MARKERS.some((marker) => lowerBody.includes(marker));
    if (loginWallDetected) {
      return buildProtectedFallback(
        target,
        target.url.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || host,
        "This page appears login-protected. Sign in through a supported connector to extract content."
      );
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
        ingestionStatus: deriveIngestionStatus("metadata", validation, "public_source"),
        acquisitionMethod: "metadata",
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
      const ingestionStatus = deriveIngestionStatus("readability", validation, "public_source");
      if (validation.wordCount > 0) {
        return {
          platform: target.platform,
          normalizedUrl: target.normalizedUrl,
          source: "readability",
          sourceType: "public_source",
          ingestionStatus,
          ingestionReason: ingestionStatus === "partial_extraction" ? "limited_readability_content" : undefined,
          acquisitionMethod: "static_fetch",
          confidence: adjustConfidence(0.85, validation),
          wordCount: validation.wordCount,
          extractionQuality: deriveExtractionQuality(validation, "public_source"),
          cacheable: validation.passed,
          content: readabilityText,
          metadata: mergedMetadata,
          validation,
          contentType: inferredContentType,
        };
      }
    }

    const bodyText = extractBodyText(dom.window.document);
    const validation = assessExtractionQuality(bodyText, "body-fallback", target.platform);
    if (bodyText) {
      return {
        platform: target.platform,
        normalizedUrl: target.normalizedUrl,
        source: "body-fallback",
        sourceType: "public_source",
        ingestionStatus: deriveIngestionStatus("body-fallback", validation, "public_source"),
        ingestionReason: validation.passed ? undefined : "static_body_fallback",
        acquisitionMethod: "static_fetch",
        confidence: adjustConfidence(0.25, validation),
        wordCount: validation.wordCount,
        extractionQuality: deriveExtractionQuality(validation, "public_source"),
        cacheable: false,
        content: bodyText,
        metadata: mergedMetadata,
        validation,
        contentType: inferredContentType,
      };
    }

    const rendered = await renderPageSnapshot(target.normalizedUrl, {
      extraDelayMs: host.includes("notion.") ? 2800 : 1200,
      timeoutMs: 22000,
    });

    if (rendered?.text) {
      const renderedDom = createDom(rendered.html, rendered.finalUrl);
      const renderedMetadata = mergeStructuredMetadata(
        mergedMetadata,
        extractStructuredMetadata(renderedDom.window.document)
      );
      const readable = new Readability(renderedDom.window.document.cloneNode(true) as Document).parse();
      const renderedText = normalizeWhitespace(readable?.textContent || rendered.text).slice(0, 40000);
      const renderedValidation = assessExtractionQuality(renderedText, "readability", target.platform);

      const renderedLoginWall = LOGIN_WALL_MARKERS.some((marker) =>
        rendered.text.toLowerCase().includes(marker)
      );
      if (renderedLoginWall) {
        return buildProtectedFallback(
          target,
          renderedMetadata.title || host,
          "This page requires a logged-in session before content can be extracted."
        );
      }

      return {
        platform: target.platform,
        normalizedUrl: target.normalizedUrl,
        source: "readability",
        sourceType: "public_source",
        ingestionStatus: deriveIngestionStatus("readability", renderedValidation, "public_source"),
        ingestionReason: renderedValidation.passed ? undefined : "browser_render_partial",
        acquisitionMethod: "browser_render",
        confidence: adjustConfidence(0.78, renderedValidation),
        wordCount: renderedValidation.wordCount,
        extractionQuality: deriveExtractionQuality(renderedValidation, "public_source"),
        cacheable: renderedValidation.passed,
        content: renderedText,
        metadata: renderedMetadata,
        validation: renderedValidation,
        contentType: inferredContentType,
      };
    }

    if (metadataContent) {
      const metadataValidation = assessExtractionQuality(metadataContent, "metadata", target.platform);
      return {
        platform: target.platform,
        normalizedUrl: target.normalizedUrl,
        source: "metadata",
        sourceType: "public_source",
        ingestionStatus: deriveIngestionStatus("metadata", metadataValidation, "public_source"),
        ingestionReason: "metadata_only_fallback",
        acquisitionMethod: "metadata",
        confidence: adjustConfidence(0.55, metadataValidation),
        wordCount: metadataValidation.wordCount,
        extractionQuality: deriveExtractionQuality(metadataValidation, "public_source"),
        cacheable: false,
        content: metadataContent,
        metadata: mergedMetadata,
        validation: metadataValidation,
        contentType: inferredContentType,
      };
    }

    const emptyValidation = assessExtractionQuality("", "unavailable", target.platform);
    return {
      platform: target.platform,
      normalizedUrl: target.normalizedUrl,
      source: "unavailable",
      sourceType: "public_source",
      ingestionStatus: "failed",
      ingestionReason: "no_extractable_content",
      acquisitionMethod: "static_fetch",
      confidence: 0.05,
      wordCount: emptyValidation.wordCount,
      extractionQuality: deriveExtractionQuality(emptyValidation, "public_source"),
      cacheable: false,
      content: "",
      metadata: mergedMetadata,
      validation: emptyValidation,
      contentType: inferredContentType,
    };
  } catch (error) {
    const validation = assessExtractionQuality("", "unavailable", target.platform);
    return {
      platform: target.platform,
      normalizedUrl: target.normalizedUrl,
      source: "unavailable",
      sourceType: "public_source",
      ingestionStatus: "failed",
      ingestionReason: "static_fetch_failed",
      acquisitionMethod: "static_fetch",
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
