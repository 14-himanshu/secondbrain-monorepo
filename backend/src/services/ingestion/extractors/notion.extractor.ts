import { getNotionApiVersion, getNotionToken } from "../../../config.js";
import { adjustConfidence, assessExtractionQuality, deriveExtractionQuality } from "../validation.js";
import type { ClassificationMode, ExtractedContent, UrlTarget } from "../types.js";

const parseNotionPageId = (url: URL) => {
  const path = url.pathname.split("?")[0] || "";
  const match = path.match(/([a-f0-9]{32})/i);
  if (!match?.[1]) return undefined;
  const compact = match[1].toLowerCase();
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
};

const extractPlainText = (richText: Array<{ plain_text?: string }>) =>
  richText.map((item) => String(item?.plain_text || "").trim()).filter(Boolean).join(" ");

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const collectBlockText = (block: any): string[] => {
  const type = String(block?.type || "");
  const payload = block?.[type];
  if (!payload) return [];

  if (Array.isArray(payload.rich_text)) {
    const text = normalizeWhitespace(extractPlainText(payload.rich_text));
    return text ? [text] : [];
  }

  return [];
};

const listBlockChildren = async (blockId: string, token: string, notionVersion: string) => {
  const response = await fetch(
    `https://api.notion.com/v1/blocks/${blockId}/children?page_size=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": notionVersion,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`NOTION_CHILDREN_${response.status}`);
  }

  const payload = (await response.json()) as { results?: any[] };
  return Array.isArray(payload.results) ? payload.results : [];
};

export const extractNotionContent = async (
  target: UrlTarget,
  mode: ClassificationMode = "deep"
): Promise<ExtractedContent> => {
  const notionToken = getNotionToken();
  const notionVersion = getNotionApiVersion();
  const pageId = parseNotionPageId(target.url);

  if (!notionToken || !pageId) {
    const validation = assessExtractionQuality("", "unavailable", target.platform);
    return {
      platform: target.platform,
      normalizedUrl: target.normalizedUrl,
      source: "unavailable",
      sourceType: "protected_source",
      confidence: 0.05,
      wordCount: validation.wordCount,
      extractionQuality: deriveExtractionQuality(validation, "protected_source"),
      cacheable: false,
      content: "",
      metadata: {
        title: target.url.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || "Notion page",
        description: "Protected Notion content requires authenticated ingestion.",
        tags: ["notion", "protected"],
        contentType: "document",
      },
      validation,
      contentType: "document",
    };
  }

  try {
    const pageResponse = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Notion-Version": notionVersion,
      },
    });

    if (!pageResponse.ok) {
      throw new Error(`NOTION_PAGE_${pageResponse.status}`);
    }

    const page = await pageResponse.json();
    const titleProperty = Object.values((page as any)?.properties || {}).find((property: any) => property?.type === "title");
    const title = normalizeWhitespace(
      extractPlainText(Array.isArray((titleProperty as any)?.title) ? (titleProperty as any).title : [])
    ) || "Notion page";

    const blocks = await listBlockChildren(pageId, notionToken, notionVersion);
    const bodyText = normalizeWhitespace(blocks.flatMap((block) => collectBlockText(block)).join(" "));
    const validation = assessExtractionQuality(bodyText, "notion-api", target.platform);
    const confidence = adjustConfidence(0.93, validation);

    if (!bodyText) {
      return {
        platform: target.platform,
        normalizedUrl: target.normalizedUrl,
        source: "notion-api",
        sourceType: "protected_source",
        confidence: 0.1,
        wordCount: validation.wordCount,
        extractionQuality: deriveExtractionQuality(validation, "protected_source"),
        cacheable: false,
        content: "",
        metadata: {
          title,
          description: "Notion content is empty or inaccessible for this integration.",
          tags: ["notion", "protected"],
          contentType: "document",
        },
        validation,
        contentType: "document",
      };
    }

    if (mode === "quick") {
      return {
        platform: target.platform,
        normalizedUrl: target.normalizedUrl,
        source: "notion-api",
        sourceType: "public_source",
        confidence,
        wordCount: validation.wordCount,
        extractionQuality: deriveExtractionQuality(validation, "public_source"),
        cacheable: false,
        content: normalizeWhitespace(`${title}. ${bodyText.slice(0, 320)}`),
        metadata: {
          title,
          description: bodyText.slice(0, 500),
          tags: ["notion", "workspace"],
          contentType: "document",
        },
        validation,
        contentType: "document",
      };
    }

    return {
      platform: target.platform,
      normalizedUrl: target.normalizedUrl,
      source: "notion-api",
      sourceType: "public_source",
      confidence,
      wordCount: validation.wordCount,
      extractionQuality: deriveExtractionQuality(validation, "public_source"),
      cacheable: validation.passed,
      content: bodyText,
      metadata: {
        title,
        description: bodyText.slice(0, 500),
        tags: ["notion", "workspace"],
        contentType: "document",
      },
      validation,
      contentType: "document",
    };
  } catch {
    const validation = assessExtractionQuality("", "unavailable", target.platform);
    return {
      platform: target.platform,
      normalizedUrl: target.normalizedUrl,
      source: "unavailable",
      sourceType: "protected_source",
      confidence: 0.05,
      wordCount: validation.wordCount,
      extractionQuality: deriveExtractionQuality(validation, "protected_source"),
      cacheable: false,
      content: "",
      metadata: {
        title: "Notion page",
        description: "Notion retrieval failed. Connect workspace or paste content manually.",
        tags: ["notion", "protected"],
        contentType: "document",
      },
      validation,
      contentType: "document",
    };
  }
};

