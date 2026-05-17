import type { ClassificationMode, ExtractedContent, UrlTarget, ExtractContext } from "./types.js";
import { normalizeUrl } from "./url.js";
import { extractArticleContent } from "./extractors/article.extractor.js";
import { extractNotionContent } from "./extractors/notion.extractor.js";
import { extractRedditContent } from "./extractors/reddit.extractor.js";
import { extractTwitterContent } from "./extractors/twitter.extractor.js";
import { extractYouTubeContent } from "./extractors/youtube.extractor.js";

type Extractor = (target: UrlTarget, mode: ClassificationMode, context?: ExtractContext) => Promise<ExtractedContent>;

const extractorRegistry: Record<UrlTarget["platform"], Extractor> = {
  youtube: extractYouTubeContent,
  medium: extractArticleContent,
  reddit: extractRedditContent,
  twitter: extractTwitterContent,
  notion: extractNotionContent,
  google: (target: UrlTarget, mode: ClassificationMode, context?: ExtractContext) => import("./extractors/google.extractor.js").then(m => m.extractGoogleContent(target, mode, context)),

  generic: extractArticleContent,
};

export const extractContentFromUrl = async (rawUrl: string, mode: ClassificationMode = "deep", context?: ExtractContext) => {
  const target = normalizeUrl(rawUrl);
  const extractor = extractorRegistry[target.platform] || extractArticleContent;
  const extraction = await extractor(target, mode, context);

  return {
    target,
    extraction,
  };
};
