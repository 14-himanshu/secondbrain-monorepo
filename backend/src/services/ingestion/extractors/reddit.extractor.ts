import { fetchJsonResponse, normalizeWhitespace } from "../html.js";
import { adjustConfidence, assessExtractionQuality, deriveExtractionQuality, deriveIngestionStatus } from "../validation.js";
import type { ClassificationMode, ExtractedContent, UrlTarget } from "../types.js";
import { extractArticleContent } from "./article.extractor.js";

export const extractRedditContent = async (
  target: UrlTarget,
  mode: ClassificationMode = "deep"
): Promise<ExtractedContent> => {
  try {
    const jsonUrl = new URL(target.normalizedUrl);
    jsonUrl.pathname = `${jsonUrl.pathname.replace(/\/$/, "")}.json`;
    jsonUrl.searchParams.set("raw_json", "1");

    const payload = await fetchJsonResponse<any[]>(jsonUrl.toString(), 10000);
    const post = payload?.[0]?.data?.children?.[0]?.data;

    if (post) {
      const content = normalizeWhitespace([post.title, post.selftext].filter(Boolean).join(". "));
      const validation = assessExtractionQuality(content, "reddit-json", target.platform);

      return {
        platform: target.platform,
        normalizedUrl: target.normalizedUrl,
        source: "reddit-json",
        sourceType: "public_source",
        ingestionStatus: deriveIngestionStatus("reddit-json", validation, "public_source"),
        acquisitionMethod: "api",
        confidence: adjustConfidence(post.selftext ? 0.9 : 0.78, validation),
        wordCount: validation.wordCount,
        extractionQuality: deriveExtractionQuality(validation, "public_source"),
        cacheable: validation.passed,
        content,
        metadata: {
          title: post.title,
          description: normalizeWhitespace(post.selftext || "") || post.title,
          author: post.author,
          tags: [post.subreddit ? String(post.subreddit).toLowerCase() : "reddit"].filter(Boolean),
          contentType: "post",
        },
        validation,
        contentType: "post",
      };
    }
  } catch {
    // Fall back to generic extraction below.
  }

  return extractArticleContent(target, mode);
};
