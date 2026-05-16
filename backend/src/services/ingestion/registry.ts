import type { ClassificationMode, ExtractedContent, UrlTarget } from "./types.js";
import { normalizeUrl } from "./url.js";
import { extractArticleContent } from "./extractors/article.extractor.js";
import { extractRedditContent } from "./extractors/reddit.extractor.js";
import { extractTwitterContent } from "./extractors/twitter.extractor.js";
import { extractYouTubeContent } from "./extractors/youtube.extractor.js";

type Extractor = (target: UrlTarget, mode: ClassificationMode) => Promise<ExtractedContent>;

const extractorRegistry: Record<UrlTarget["platform"], Extractor> = {
  youtube: extractYouTubeContent,
  medium: extractArticleContent,
  reddit: extractRedditContent,
  twitter: extractTwitterContent,
  generic: extractArticleContent,
};

export const extractContentFromUrl = async (rawUrl: string, mode: ClassificationMode = "deep") => {
  const target = normalizeUrl(rawUrl);
  const extractor = extractorRegistry[target.platform] || extractArticleContent;
  const extraction = await extractor(target, mode);

  return {
    target,
    extraction,
  };
};
