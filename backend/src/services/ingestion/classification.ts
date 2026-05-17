import type { BackendContentType, ClassificationMode, ExtractedContent } from "./types.js";

const sentenceSplit = (text: string) =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const limitWords = (text: string, maxWords: number) => {
  const words = text.split(/\s+/).filter(Boolean);
  return words.length <= maxWords ? text : `${words.slice(0, maxWords).join(" ")}...`;
};

const inferTagsFromTitle = (title?: string) => {
  if (!title) return [];
  return Array.from(
    new Set(
      title
        .toLowerCase()
        .split(/[^a-z0-9+#]+/g)
        .map((token) => token.trim())
        .filter((token) => token.length >= 4)
        .slice(0, 4)
    )
  );
};

export const toBackendType = (contentType: BackendContentType) => contentType;

export const deriveDeterministicTags = (extraction: ExtractedContent) => {
  const metadataTags = extraction.metadata.tags.filter(Boolean).slice(0, 6);
  if (metadataTags.length > 0) return metadataTags;

  const titleTags = inferTagsFromTitle(extraction.metadata.title);
  if (titleTags.length > 0) return titleTags;

  switch (extraction.platform) {
    case "youtube":
      return ["video"];
    case "reddit":
      return ["reddit"];
    case "twitter":
      return ["social"];
    default:
      return ["web"];
  }
};

export const deriveCategory = (extraction: ExtractedContent) => {
  if (extraction.platform === "youtube") return "Entertainment";
  if (extraction.platform === "reddit" || extraction.platform === "twitter") return "News";
  if (extraction.contentType === "document") return "Research";
  return "Other";
};

export const deriveTopics = (tags: string[], category?: string) => {
  const topics = category ? [category] : [];
  for (const tag of tags.slice(0, 3)) {
    if (!topics.includes(tag)) topics.push(tag);
  }
  return topics;
};

export const buildDeterministicDescription = (extraction: ExtractedContent) => {
  const primary =
    extraction.metadata.description ||
    extraction.metadata.excerpt ||
    sentenceSplit(extraction.content)[0] ||
    "No summary available.";

  const supportingSentences = sentenceSplit(extraction.content).slice(0, 3).map((sentence) => limitWords(sentence, 24));
  const sections = [limitWords(primary, 30)];

  if (supportingSentences.length > 0) {
    sections.push(`MAIN IDEAS:\n${supportingSentences.map((sentence) => `• ${sentence}`).join("\n")}`);
  }

  return sections.join("\n\n").trim();
};

export const shouldUseAiSynthesis = (extraction: ExtractedContent, mode: ClassificationMode) => {
  if (mode !== "deep") return false;
  if (extraction.sourceType === "protected_source") return false;
  if (!extraction.validation.passed) return false;
  if (extraction.extractionQuality === "low") return false;
  if (extraction.confidence < 0.75) return false;
  if (extraction.source === "metadata" || extraction.source === "body-fallback" || extraction.source === "unavailable") {
    return false;
  }
  return extraction.wordCount >= 80;
};

export const truncateForSynthesis = (content: string, maxChars = 5000) =>
  content.length <= maxChars ? content : `${content.slice(0, maxChars)}...`;
