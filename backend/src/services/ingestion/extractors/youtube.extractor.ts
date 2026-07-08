import { fetchJinaReader } from "./article.extractor.js";
import { adjustConfidence, assessExtractionQuality, deriveExtractionQuality, deriveIngestionStatus } from "../validation.js";
import type { ClassificationMode, ExtractedContent, UrlTarget } from "../types.js";
import { normalizeWhitespace } from "../html.js";

export const extractYouTubeContent = async (
  target: UrlTarget,
  mode: ClassificationMode = "deep"
): Promise<ExtractedContent> => {
  try {
    const jinaResult = await fetchJinaReader(target.normalizedUrl);

    if (!jinaResult || !jinaResult.title) {
      throw new Error("youtube_fetch_failed");
    }

    const title = jinaResult.title;
    // Jina usually puts the channel and description in the metadata/description, or we just extract what we can.
    const description = jinaResult.description || undefined;
    const contentText = normalizeWhitespace(jinaResult.text || "");
    
    // Metadata block
    const metadata = {
      title,
      description,
      channel: undefined, // Hard to extract reliably without full HTML, but Title/Desc is usually enough
      tags: [],
      contentType: "video" as const,
    };

    const metadataContent = normalizeWhitespace([title, description].filter(Boolean).join(". "));

    if (mode === "quick") {
      const validation = assessExtractionQuality(metadataContent, "youtube-metadata", target.platform);
      return {
        platform: target.platform,
        normalizedUrl: target.normalizedUrl,
        source: "youtube-metadata",
        sourceType: "public_source",
        ingestionStatus: deriveIngestionStatus("youtube-metadata", validation, "public_source"),
        ingestionReason: "quick_metadata_preview",
        acquisitionMethod: "static_fetch",
        confidence: adjustConfidence(0.82, validation),
        wordCount: validation.wordCount,
        extractionQuality: deriveExtractionQuality(validation, "public_source"),
        cacheable: true,
        content: metadataContent,
        metadata,
        validation,
        contentType: "video",
      };
    }

    // Deep extraction (try to use the full text which contains the transcript)
    const hasTranscript = contentText.length > metadataContent.length + 50;
    const validation = assessExtractionQuality(
      hasTranscript ? contentText : metadataContent,
      hasTranscript ? "youtube-transcript" : "youtube-metadata",
      target.platform
    );

    return {
      platform: target.platform,
      normalizedUrl: target.normalizedUrl,
      source: hasTranscript ? "youtube-transcript" : "youtube-metadata",
      sourceType: "public_source",
      ingestionStatus: deriveIngestionStatus(hasTranscript ? "youtube-transcript" : "youtube-metadata", validation, "public_source"),
      ingestionReason: hasTranscript ? undefined : "transcript_unavailable",
      acquisitionMethod: "static_fetch",
      confidence: adjustConfidence(hasTranscript ? 0.95 : 0.82, validation),
      wordCount: validation.wordCount,
      extractionQuality: deriveExtractionQuality(validation, "public_source"),
      cacheable: true,
      content: hasTranscript ? contentText : metadataContent,
      metadata,
      validation,
      contentType: "video",
    };

  } catch {
    const validation = assessExtractionQuality("", "unavailable", target.platform);
    return {
      platform: target.platform,
      normalizedUrl: target.normalizedUrl,
      source: "unavailable",
      sourceType: "public_source",
      ingestionStatus: "failed",
      ingestionReason: "youtube_fetch_failed",
      acquisitionMethod: "static_fetch",
      confidence: 0.05,
      wordCount: validation.wordCount,
      extractionQuality: deriveExtractionQuality(validation, "public_source"),
      cacheable: false,
      content: "",
      metadata: { tags: [], contentType: "video" },
      validation,
      contentType: "video",
    };
  }
};
