import { normalizeUrl } from "./url.js";
import { extractArticleContent } from "./extractors/article.extractor.js";
import { extractNotionContent } from "./extractors/notion.extractor.js";
import { extractRedditContent } from "./extractors/reddit.extractor.js";
import { extractTwitterContent } from "./extractors/twitter.extractor.js";
import { extractYouTubeContent } from "./extractors/youtube.extractor.js";
const extractorRegistry = {
    youtube: extractYouTubeContent,
    medium: extractArticleContent,
    reddit: extractRedditContent,
    twitter: extractTwitterContent,
    notion: extractNotionContent,
    google: (target, mode, context) => import("./extractors/google.extractor.js").then(m => m.extractGoogleContent(target, mode, context)),
    generic: extractArticleContent,
};
export const extractContentFromUrl = async (rawUrl, mode = "deep", context) => {
    const target = normalizeUrl(rawUrl);
    const extractor = extractorRegistry[target.platform] || extractArticleContent;
    const extraction = await extractor(target, mode, context);
    return {
        target,
        extraction,
    };
};
//# sourceMappingURL=registry.js.map