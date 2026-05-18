import { createDom, extractStructuredMetadata, fetchJsonResponse, fetchTextResponse, mergeStructuredMetadata, normalizeWhitespace } from "../html.js";
import { adjustConfidence, assessExtractionQuality, deriveExtractionQuality } from "../validation.js";
const findJsonObjectAfter = (input, marker) => {
    const markerIndex = input.indexOf(marker);
    if (markerIndex === -1)
        return null;
    const start = input.indexOf("{", markerIndex);
    if (start === -1)
        return null;
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
        if (inString)
            continue;
        if (char === "{")
            depth++;
        if (char === "}")
            depth--;
        if (depth === 0) {
            try {
                return JSON.parse(input.slice(start, index + 1));
            }
            catch {
                return null;
            }
        }
    }
    return null;
};
const extractTranscriptText = (payload) => {
    if (!payload?.events || !Array.isArray(payload.events))
        return "";
    const fragments = payload.events.flatMap((event) => Array.isArray(event?.segs)
        ? event.segs
            .map((segment) => normalizeWhitespace(String(segment?.utf8 || "")))
            .filter(Boolean)
        : []);
    return normalizeWhitespace(fragments.join(" "));
};
const chooseCaptionTrack = (playerResponse) => {
    const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(tracks) || tracks.length === 0)
        return null;
    return (tracks.find((track) => String(track?.languageCode || "").toLowerCase().startsWith("en")) ||
        tracks[0] ||
        null);
};
export const extractYouTubeContent = async (target, mode = "deep") => {
    try {
        const fetched = await fetchTextResponse(target.normalizedUrl, 10000);
        const dom = createDom(fetched.body, fetched.finalUrl);
        const htmlMetadata = extractStructuredMetadata(dom.window.document);
        const jsonLdMetadata = mergeStructuredMetadata(htmlMetadata, {
            channel: htmlMetadata.siteName,
        });
        const playerResponse = findJsonObjectAfter(fetched.body, "var ytInitialPlayerResponse =") ||
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
        if (mode === "quick") {
            const validation = assessExtractionQuality(metadataContent, "youtube-metadata", target.platform);
            return {
                platform: target.platform,
                normalizedUrl: target.normalizedUrl,
                source: metadataContent ? "youtube-metadata" : "unavailable",
                sourceType: "public_source",
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
        const captionTrack = chooseCaptionTrack(playerResponse);
        if (captionTrack?.baseUrl) {
            try {
                const transcriptUrl = captionTrack.baseUrl.includes("fmt=")
                    ? captionTrack.baseUrl
                    : `${captionTrack.baseUrl}${captionTrack.baseUrl.includes("?") ? "&" : "?"}fmt=json3`;
                const transcriptPayload = await fetchJsonResponse(transcriptUrl, 10000);
                const transcript = extractTranscriptText(transcriptPayload);
                const validation = assessExtractionQuality(transcript, "youtube-transcript", target.platform);
                if (transcript && validation.passed) {
                    return {
                        platform: target.platform,
                        normalizedUrl: target.normalizedUrl,
                        source: "youtube-transcript",
                        sourceType: "public_source",
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
            }
            catch {
                // Transcript is optional. Metadata fallback below remains deterministic.
            }
        }
        const validation = assessExtractionQuality(metadataContent, "youtube-metadata", target.platform);
        return {
            platform: target.platform,
            normalizedUrl: target.normalizedUrl,
            source: metadataContent ? "youtube-metadata" : "unavailable",
            sourceType: "public_source",
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
    catch {
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
            metadata: { tags: [], contentType: "video" },
            validation,
            contentType: "video",
        };
    }
};
//# sourceMappingURL=youtube.extractor.js.map