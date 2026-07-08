import { getNotionApiVersion, getNotionToken } from "../../../config.js";
import { fetchJinaReader } from "./article.extractor.js";
import { createDom, extractStructuredMetadata, mergeStructuredMetadata, normalizeWhitespace as normalizeHtmlWhitespace } from "../html.js";
import { adjustConfidence, assessExtractionQuality, deriveExtractionQuality, deriveIngestionStatus } from "../validation.js";
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
  const results: any[] = [];
  let nextCursor: string | undefined;

  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${blockId}/children`);
    url.searchParams.set("page_size", "100");
    if (nextCursor) {
      url.searchParams.set("start_cursor", nextCursor);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": notionVersion,
      },
    });

    if (!response.ok) {
      throw new Error(`NOTION_CHILDREN_${response.status}`);
    }

    const payload = (await response.json()) as { results?: any[]; next_cursor?: string | null; has_more?: boolean };
    results.push(...(Array.isArray(payload.results) ? payload.results : []));
    nextCursor = payload.has_more ? payload.next_cursor || undefined : undefined;
  } while (nextCursor);

  return results;
};

const collectNestedBlockText = async (
  blockId: string,
  token: string,
  notionVersion: string,
  depth = 0
): Promise<string[]> => {
  if (depth > 6) return [];
  const children = await listBlockChildren(blockId, token, notionVersion);
  const parts: string[] = [];

  for (const child of children) {
    parts.push(...collectBlockText(child));
    if (child?.has_children && child?.id) {
      parts.push(...(await collectNestedBlockText(String(child.id), token, notionVersion, depth + 1)));
    }
  }

  return parts;
};

const extractPublicNotionContent = async (target: UrlTarget): Promise<ExtractedContent | null> => {
  const rendered = await fetchJinaReader(target.normalizedUrl);
  if (!rendered?.text) return null;

  const lower = rendered.text.toLowerCase();
  if (
    lower.includes("request access") ||
    lower.includes("you do not have access") ||
    lower.includes("log in to continue")
  ) {
    const validation = assessExtractionQuality("", "unavailable", target.platform);
    return {
      platform: target.platform,
      normalizedUrl: target.normalizedUrl,
      source: "unavailable",
      sourceType: "protected_source",
      ingestionStatus: "authentication_required",
      ingestionReason: "notion_authentication_required",
      acquisitionMethod: "static_fetch",
      confidence: 0.05,
      wordCount: validation.wordCount,
      extractionQuality: deriveExtractionQuality(validation, "protected_source"),
      cacheable: false,
      content: "",
      metadata: {
        title: target.url.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || "Notion page",
        description: "This Notion page requires access before it can be extracted.",
        tags: ["notion", "protected"],
        contentType: "document",
      },
      validation,
      contentType: "document",
    };
  }

  const metadata = {
    title: rendered.title || target.url.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || "Notion page",
    description: rendered.description,
    tags: ["notion", "public"],
    contentType: "document" as const,
  };
  const content = normalizeHtmlWhitespace(rendered.text).slice(0, 40000);
  const validation = assessExtractionQuality(content, "body-fallback", target.platform);

  return {
    platform: target.platform,
    normalizedUrl: target.normalizedUrl,
    source: "body-fallback",
    sourceType: "public_source",
    ingestionStatus: deriveIngestionStatus("body-fallback", validation, "public_source"),
    ingestionReason: validation.passed ? undefined : "public_notion_partial",
    acquisitionMethod: "static_fetch",
    confidence: adjustConfidence(0.82, validation),
    wordCount: validation.wordCount,
    extractionQuality: deriveExtractionQuality(validation, "public_source"),
    cacheable: validation.passed,
    content,
    metadata,
    validation,
    contentType: "document",
  };
};

export const extractNotionContent = async (
  target: UrlTarget,
  mode: ClassificationMode = "deep"
): Promise<ExtractedContent> => {
  const notionToken = getNotionToken();
  const notionVersion = getNotionApiVersion();
  const pageId = parseNotionPageId(target.url);

  if (!notionToken || !pageId) {
    const publicExtraction = await extractPublicNotionContent(target);
    if (publicExtraction) return publicExtraction;

    const validation = assessExtractionQuality("", "unavailable", target.platform);
    return {
      platform: target.platform,
      normalizedUrl: target.normalizedUrl,
      source: "unavailable",
      sourceType: "protected_source",
      ingestionStatus: "authentication_required",
      ingestionReason: "notion_authentication_required",
      acquisitionMethod: "browser_render",
      confidence: 0.05,
      wordCount: validation.wordCount,
      extractionQuality: deriveExtractionQuality(validation, "protected_source"),
      cacheable: false,
      content: "",
      metadata: {
        title: target.url.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || "Notion page",
        description: "Connect Notion to extract private workspace content.",
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
    const nestedText = (
      await Promise.all(
        blocks
          .filter((block) => block?.has_children && block?.id)
          .map((block) => collectNestedBlockText(String(block.id), notionToken, notionVersion))
      )
    ).flat();
    const bodyText = normalizeWhitespace(
      [...blocks.flatMap((block) => collectBlockText(block)), ...nestedText].join(" ")
    ).slice(0, 40000);
    const validation = assessExtractionQuality(bodyText, "notion-api", target.platform);
    const confidence = adjustConfidence(0.93, validation);

    if (!bodyText) {
      const publicFallback = await extractPublicNotionContent(target);
      if (publicFallback) return publicFallback;

      return {
        platform: target.platform,
        normalizedUrl: target.normalizedUrl,
        source: "notion-api",
        sourceType: "protected_source",
        ingestionStatus: "authentication_required",
        ingestionReason: "notion_empty_or_restricted",
        acquisitionMethod: "api",
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
        sourceType: "protected_source",
        ingestionStatus: deriveIngestionStatus("notion-api", validation, "protected_source"),
        ingestionReason: "quick_notion_preview",
        acquisitionMethod: "api",
        confidence,
        wordCount: validation.wordCount,
        extractionQuality: deriveExtractionQuality(validation, "protected_source"),
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
      sourceType: "protected_source",
      ingestionStatus: deriveIngestionStatus("notion-api", validation, "protected_source"),
      acquisitionMethod: "api",
      confidence,
      wordCount: validation.wordCount,
      extractionQuality: deriveExtractionQuality(validation, "protected_source"),
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
    const publicFallback = await extractPublicNotionContent(target);
    if (publicFallback) return publicFallback;

    const validation = assessExtractionQuality("", "unavailable", target.platform);
    return {
      platform: target.platform,
      normalizedUrl: target.normalizedUrl,
      source: "unavailable",
      sourceType: "protected_source",
      ingestionStatus: "authentication_required",
      ingestionReason: "notion_api_failed",
      acquisitionMethod: "api",
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
