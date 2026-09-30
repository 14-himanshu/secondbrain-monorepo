import { fetchJinaReader } from "./article.extractor.js";
import { createDom, extractStructuredMetadata, fetchTextResponse, mergeStructuredMetadata, normalizeWhitespace } from "../html.js";
import { adjustConfidence, assessExtractionQuality, deriveExtractionQuality, deriveIngestionStatus } from "../validation.js";
import type { ClassificationMode, ExtractedContent, UrlTarget } from "../types.js";

const extractHashtags = (value: string) =>
  Array.from(new Set((value.match(/#[a-z0-9_]+/gi) || []).map((tag) => tag.replace(/^#/, "").toLowerCase()))).slice(0, 8);

export const extractTwitterContent = async (
  target: UrlTarget,
  _mode: ClassificationMode = "deep"
): Promise<ExtractedContent> => {
  try {
    const statusMatch = target.url.pathname.match(/\/([^/]+)\/status\/(\d+)/i);
    if (statusMatch) {
      const [, screenName, statusId] = statusMatch;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);
        const fxRes = await fetch(`https://api.fxtwitter.com/${screenName}/status/${statusId}`, {
          signal: controller.signal,
          headers: { "User-Agent": "SecondBrain/1.0" },
        });
        clearTimeout(timeout);

        if (fxRes.ok) {
          const data = (await fxRes.json()) as any;
          if (data?.tweet?.text) {
            const tweet = data.tweet;
            const author = tweet.author?.name ? `${tweet.author.name} (@${tweet.author.screen_name || screenName})` : screenName;
            const tweetText = tweet.text;
            const fullContent = `Post by ${author}:\n"${tweetText}"\nEngagement: ${tweet.likes ?? 0} likes, ${tweet.retweets ?? 0} retweets.`;
            const tags = Array.from(new Set(["twitter", "social", ...extractHashtags(tweetText)])).slice(0, 8);
            const validation = assessExtractionQuality(fullContent, "body-fallback", target.platform);

            return {
              platform: target.platform,
              normalizedUrl: target.normalizedUrl,
              source: "body-fallback",
              sourceType: "public_source",
              ingestionStatus: "full_extraction",
              acquisitionMethod: "static_fetch",
              confidence: 0.98,
              wordCount: validation.wordCount,
              extractionQuality: "high",
              cacheable: true,
              content: fullContent,
              metadata: {
                title: `Post by ${author}: ${tweetText.slice(0, 60)}...`,
                description: tweetText,
                author,
                tags,
                contentType: "post",
              },
              validation,
              contentType: "post",
            };
          }
        }
      } catch (fxErr) {
        console.warn("[FIXTWEET_FALLBACK]", (fxErr as Error).message);
      }
    }

    const fetched = await fetchTextResponse(target.normalizedUrl, 10000);
    const dom = createDom(fetched.body, fetched.finalUrl);
    const metadata = extractStructuredMetadata(dom.window.document);
    const tags = Array.from(new Set([...metadata.tags, ...extractHashtags(`${metadata.title || ""} ${metadata.description || ""}`)])).slice(0, 8);
    const mergedMetadata = mergeStructuredMetadata(metadata, { tags, contentType: "post" });
    const metadataContent = normalizeWhitespace([mergedMetadata.title, mergedMetadata.description].filter(Boolean).join(". "));
    const validation = assessExtractionQuality(metadataContent, "twitter-metadata", target.platform);

    if (!validation.passed || validation.wordCount < 20) {
      const jinaResult = await fetchJinaReader(target.normalizedUrl);
      if (jinaResult?.text) {
        const renderedMetadata = mergeStructuredMetadata(
          mergedMetadata,
          { title: jinaResult.title, description: jinaResult.description }
        );
        const renderedContent = normalizeWhitespace(
          [
            renderedMetadata.title,
            renderedMetadata.description,
            jinaResult.text,
          ]
            .filter(Boolean)
            .join(". ")
        ).slice(0, 12000);
        const renderedValidation = assessExtractionQuality(renderedContent, "body-fallback", target.platform);

        return {
          platform: target.platform,
          normalizedUrl: target.normalizedUrl,
          source: "body-fallback",
          sourceType: "public_source",
          ingestionStatus: deriveIngestionStatus("body-fallback", renderedValidation, "public_source"),
          ingestionReason: renderedValidation.passed ? undefined : "rendered_tweet_partial",
          acquisitionMethod: "static_fetch",
          confidence: adjustConfidence(0.81, renderedValidation),
          wordCount: renderedValidation.wordCount,
          extractionQuality: deriveExtractionQuality(renderedValidation, "public_source"),
          cacheable: renderedValidation.passed,
          content: renderedContent,
          metadata: {
            ...renderedMetadata,
            tags: Array.from(
              new Set([
                ...renderedMetadata.tags,
                ...extractHashtags(renderedContent),
              ])
            ).slice(0, 8),
          },
          validation: renderedValidation,
          contentType: "post",
        };
      }
    }

    return {
      platform: target.platform,
      normalizedUrl: target.normalizedUrl,
      source: metadataContent ? "twitter-metadata" : "unavailable",
      sourceType: "public_source",
      ingestionStatus: metadataContent
        ? deriveIngestionStatus("twitter-metadata", validation, "public_source")
        : "failed",
      ingestionReason: metadataContent ? "metadata_only_tweet" : "tweet_fetch_failed",
      acquisitionMethod: "metadata",
      confidence: metadataContent ? adjustConfidence(0.72, validation) : 0.05,
      wordCount: validation.wordCount,
      extractionQuality: deriveExtractionQuality(validation, "public_source"),
      cacheable: validation.passed && metadataContent.length > 40,
      content: metadataContent,
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
      ingestionStatus: "failed",
      ingestionReason: "tweet_fetch_failed",
      acquisitionMethod: "static_fetch",
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
