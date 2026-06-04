import { createDom, extractStructuredMetadata, fetchJsonResponse, fetchTextResponse, mergeStructuredMetadata, normalizeWhitespace } from "../html.js";
import { adjustConfidence, assessExtractionQuality, deriveExtractionQuality, deriveIngestionStatus } from "../validation.js";
import type { ClassificationMode, ExtractedContent, UrlTarget } from "../types.js";
import { YoutubeTranscript } from "youtube-transcript";

type CachedYouTubePage = {
  fetchedAt: number;
  metadata: ExtractedContent["metadata"];
  metadataContent: string;
  playerResponse: any;
};

const YOUTUBE_PAGE_CACHE_TTL_MS = 30 * 60 * 1000;
const YOUTUBE_TRANSCRIPT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const youtubePageCache = new Map<string, CachedYouTubePage>();
const youtubeTranscriptCache = new Map<string, { fetchedAt: number; transcript: string }>();

const findJsonObjectAfter = (input: string, marker: string) => {
  const markerIndex = input.indexOf(marker);
  if (markerIndex === -1) return null;

  const start = input.indexOf("{", markerIndex);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < input.length; index++) {
    const char = input[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") depth++;
    if (char === "}") depth--;

    if (depth === 0) {
      try {
        return JSON.parse(input.slice(start, index + 1));
      } catch {
        return null;
      }
    }
  }

  return null;
};

const extractTranscriptText = (payload: any) => {
  if (!payload?.events || !Array.isArray(payload.events)) return "";

  const fragments = payload.events.flatMap((event: any) =>
    Array.isArray(event?.segs)
      ? event.segs
          .map((segment: any) => normalizeWhitespace(String(segment?.utf8 || "")))
          .filter(Boolean)
      : []
  );

  return normalizeWhitespace(fragments.join(" "));
};

const chooseCaptionTrack = (playerResponse: any) => {
  const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!Array.isArray(tracks) || tracks.length === 0) return null;

  return (
    tracks.find((track: any) => String(track?.languageCode || "").toLowerCase().startsWith("en")) ||
    tracks[0] ||
    null
  );
};

const getCachedYouTubePage = (key: string) => {
  const cached = youtubePageCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > YOUTUBE_PAGE_CACHE_TTL_MS) {
    youtubePageCache.delete(key);
    return null;
  }
  return cached;
};

const getCachedTranscript = (key: string) => {
  const cached = youtubeTranscriptCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > YOUTUBE_TRANSCRIPT_CACHE_TTL_MS) {
    youtubeTranscriptCache.delete(key);
    return null;
  }
  return cached.transcript;
};

const readYouTubePage = async (target: UrlTarget) => {
  const cacheKey = target.videoId || target.normalizedUrl;
  const cached = getCachedYouTubePage(cacheKey);
  if (cached) return cached;

  const fetched = await fetchTextResponse(target.normalizedUrl, 8000);
  const dom = createDom(fetched.body, fetched.finalUrl);
  const htmlMetadata = extractStructuredMetadata(dom.window.document);
  const jsonLdMetadata = mergeStructuredMetadata(htmlMetadata, {
    channel: htmlMetadata.siteName,
  });

  const playerResponse =
    findJsonObjectAfter(fetched.body, "var ytInitialPlayerResponse =") ||
    findJsonObjectAfter(fetched.body, "ytInitialPlayerResponse =") ||
    findJsonObjectAfter(fetched.body, '"captions":');

  const videoDetails = playerResponse?.videoDetails;
  const metadata = mergeStructuredMetadata(jsonLdMetadata, {
    title: videoDetails?.title,
    description: normalizeWhitespace(String(videoDetails?.shortDescription || "")) || undefined,
    channel: normalizeWhitespace(String(videoDetails?.author || "")) || undefined,
    tags: Array.isArray(videoDetails?.keywords) ? videoDetails.keywords : [],
    durationSeconds: Number(videoDetails?.lengthSeconds || 0) || undefined,
    contentType: "video",
  });
  const metadataContent = normalizeWhitespace([metadata.title, metadata.description].filter(Boolean).join(". "));

  const snapshot = {
    fetchedAt: Date.now(),
    metadata,
    metadataContent,
    playerResponse,
  };
  youtubePageCache.set(cacheKey, snapshot);
  return snapshot;
};

export const extractYouTubeContent = async (
  target: UrlTarget,
  mode: ClassificationMode = "deep"
): Promise<ExtractedContent> => {
  try {
    const cacheKey = target.videoId || target.normalizedUrl;
    const { metadata, metadataContent, playerResponse } = await readYouTubePage(target);

    if (mode === "quick") {
      const validation = assessExtractionQuality(metadataContent, "youtube-metadata", target.platform);
      return {
        platform: target.platform,
        normalizedUrl: target.normalizedUrl,
        source: metadataContent ? "youtube-metadata" : "unavailable",
        sourceType: "public_source",
        ingestionStatus: metadataContent
          ? deriveIngestionStatus("youtube-metadata", validation, "public_source")
          : "failed",
        ingestionReason: metadataContent ? "quick_metadata_preview" : "youtube_fetch_failed",
        acquisitionMethod: "metadata",
        confidence: metadataContent ? adjustConfidence(0.82, validation) : 0.05,
        wordCount: validation.wordCount,
        extractionQuality: deriveExtractionQuality(validation, "public_source"),
        cacheable: Boolean(metadataContent),
        content: metadataContent,
        metadata,
        validation,
        contentType: "video",
      };
    }

    try {
      const cachedTranscript = getCachedTranscript(cacheKey);
      if (cachedTranscript) {
        const cachedValidation = assessExtractionQuality(cachedTranscript, "youtube-transcript", target.platform);
        if (cachedValidation.passed) {
          return {
            platform: target.platform,
            normalizedUrl: target.normalizedUrl,
            source: "youtube-transcript",
            sourceType: "public_source",
            ingestionStatus: deriveIngestionStatus("youtube-transcript", cachedValidation, "public_source"),
            acquisitionMethod: "transcript",
            confidence: adjustConfidence(0.95, cachedValidation),
            wordCount: cachedValidation.wordCount,
            extractionQuality: deriveExtractionQuality(cachedValidation, "public_source"),
            cacheable: true,
            content: cachedTranscript,
            metadata,
            validation: cachedValidation,
            contentType: "video",
          };
        }
      }

      const transcriptResponse = await YoutubeTranscript.fetchTranscript(target.videoId || target.normalizedUrl);
      const transcript = normalizeWhitespace(transcriptResponse.map((t) => t.text).join(" "));
      const validation = assessExtractionQuality(transcript, "youtube-transcript", target.platform);

      if (transcript && validation.passed) {
        youtubeTranscriptCache.set(cacheKey, { fetchedAt: Date.now(), transcript });
        return {
          platform: target.platform,
          normalizedUrl: target.normalizedUrl,
          source: "youtube-transcript",
          sourceType: "public_source",
          ingestionStatus: deriveIngestionStatus("youtube-transcript", validation, "public_source"),
          acquisitionMethod: "transcript",
          confidence: adjustConfidence(0.95, validation),
          wordCount: validation.wordCount,
          extractionQuality: deriveExtractionQuality(validation, "public_source"),
          cacheable: true,
          content: transcript,
          metadata,
          validation,
          contentType: "video",
        };
      }
    } catch (e) {
      // Transcript is optional. Metadata fallback below remains deterministic.
    }
    const validation = assessExtractionQuality(metadataContent, "youtube-metadata", target.platform);

    return {
      platform: target.platform,
      normalizedUrl: target.normalizedUrl,
      source: metadataContent ? "youtube-metadata" : "unavailable",
      sourceType: "public_source",
      ingestionStatus: metadataContent
        ? deriveIngestionStatus("youtube-metadata", validation, "public_source")
        : "failed",
      ingestionReason: metadataContent ? "transcript_unavailable" : "youtube_fetch_failed",
      acquisitionMethod: "metadata",
      confidence: metadataContent ? adjustConfidence(0.82, validation) : 0.05,
      wordCount: validation.wordCount,
      extractionQuality: deriveExtractionQuality(validation, "public_source"),
      cacheable: Boolean(metadataContent),
      content: metadataContent,
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
