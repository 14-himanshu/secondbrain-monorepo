import { JSDOM } from "jsdom";
import type { StructuredMetadata } from "./types.js";

export const REQUEST_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

const normalizeTag = (tag: string) => tag.trim().toLowerCase().replace(/[^a-z0-9+#.\-_ ]+/g, " ").replace(/\s+/g, "-");

export const normalizeWhitespace = (value: string) =>
  value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

const splitTags = (value?: string | string[]) => {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : value.split(/[,\n]/g);
  return Array.from(
    new Set(
      raw
        .map((tag) => normalizeTag(tag))
        .filter(Boolean)
        .slice(0, 12)
    )
  );
};

export const parseIsoDurationToSeconds = (value?: string) => {
  if (!value) return undefined;

  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return undefined;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
};

const safeJsonParse = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const flattenJsonLdNode = (value: unknown): Record<string, any>[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((item) => flattenJsonLdNode(item));
  if (typeof value !== "object") return [];

  const record = value as Record<string, any>;
  const graph = Array.isArray(record["@graph"]) ? record["@graph"] : [];
  return [record, ...graph.flatMap((item) => flattenJsonLdNode(item))];
};

export const createDom = (html: string, url: string) => new JSDOM(html, { url });

export const fetchTextResponse = async (url: string, timeoutMs = 12000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: REQUEST_HEADERS,
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }

    return {
      finalUrl: response.url || url,
      contentType: response.headers.get("content-type") || "",
      body: await response.text(),
    };
  } finally {
    clearTimeout(timer);
  }
};

export const fetchJsonResponse = async <T>(url: string, timeoutMs = 12000): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: REQUEST_HEADERS,
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
};

export const extractJsonLd = (document: Document) => {
  const nodes = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
  return nodes.flatMap((node) => flattenJsonLdNode(safeJsonParse(node.textContent || "")));
};

const pickMeta = (document: Document, selectors: string[]) => {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    const value = element?.getAttribute("content") || element?.textContent || "";
    const normalized = normalizeWhitespace(value);
    if (normalized) return normalized;
  }
  return undefined;
};

const pickJsonLdValue = (nodes: Record<string, any>[], keys: string[]) => {
  for (const node of nodes) {
    for (const key of keys) {
      const value = node[key];
      if (typeof value === "string" && normalizeWhitespace(value)) {
        return normalizeWhitespace(value);
      }

      if (typeof value === "object" && value?.name && normalizeWhitespace(String(value.name))) {
        return normalizeWhitespace(String(value.name));
      }
    }
  }
  return undefined;
};

const pickJsonLdDuration = (nodes: Record<string, any>[]) => {
  for (const node of nodes) {
    const seconds = parseIsoDurationToSeconds(typeof node.duration === "string" ? node.duration : undefined);
    if (seconds) return seconds;
  }
  return undefined;
};

const pickJsonLdTags = (nodes: Record<string, any>[]) => {
  for (const node of nodes) {
    if (Array.isArray(node.keywords)) return splitTags(node.keywords);
    if (typeof node.keywords === "string") return splitTags(node.keywords);
  }
  return [];
};

export const mergeStructuredMetadata = (...sources: Array<Partial<StructuredMetadata> | undefined>) => {
  const merged: StructuredMetadata = {
    tags: [],
  };

  for (const source of sources) {
    if (!source) continue;
    if (!merged.title && source.title) merged.title = source.title;
    if (!merged.description && source.description) merged.description = source.description;
    if (!merged.excerpt && source.excerpt) merged.excerpt = source.excerpt;
    if (!merged.author && source.author) merged.author = source.author;
    if (!merged.channel && source.channel) merged.channel = source.channel;
    if (!merged.durationSeconds && source.durationSeconds) merged.durationSeconds = source.durationSeconds;
    if (!merged.siteName && source.siteName) merged.siteName = source.siteName;
    if (!merged.canonicalUrl && source.canonicalUrl) merged.canonicalUrl = source.canonicalUrl;
    if (!merged.publishedTime && source.publishedTime) merged.publishedTime = source.publishedTime;
    if (!merged.contentType && source.contentType) merged.contentType = source.contentType;

    if (source.tags?.length) {
      merged.tags = Array.from(new Set([...merged.tags, ...source.tags])).slice(0, 12);
    }
  }

  return merged;
};

export const extractStructuredMetadata = (document: Document): StructuredMetadata => {
  const jsonLd = extractJsonLd(document);
  const title =
    pickMeta(document, ['meta[property="og:title"]', 'meta[name="twitter:title"]']) ||
    pickJsonLdValue(jsonLd, ["headline", "name"]) ||
    normalizeWhitespace(document.title || "") ||
    undefined;

  const description =
    pickMeta(document, ['meta[property="og:description"]', 'meta[name="description"]', 'meta[name="twitter:description"]']) ||
    pickJsonLdValue(jsonLd, ["description"]) ||
    undefined;

  const excerpt = pickMeta(document, ['meta[name="description"]']) || description;
  const author =
    pickMeta(document, ['meta[name="author"]', 'meta[property="article:author"]']) ||
    pickJsonLdValue(jsonLd, ["author", "creator"]) ||
    undefined;
  const siteName =
    pickMeta(document, ['meta[property="og:site_name"]']) ||
    pickJsonLdValue(jsonLd, ["publisher"]) ||
    undefined;
  const canonicalUrl = document.querySelector('link[rel="canonical"]')?.getAttribute("href") || undefined;
  const publishedTime = pickMeta(document, ['meta[property="article:published_time"]', 'meta[name="date"]']) || undefined;
  const contentType = pickMeta(document, ['meta[property="og:type"]']) || undefined;
  const durationSeconds = pickJsonLdDuration(jsonLd);
  const tags = Array.from(
    new Set([
      ...splitTags(pickMeta(document, ['meta[name="keywords"]', 'meta[name="news_keywords"]'])),
      ...pickJsonLdTags(jsonLd),
    ])
  ).slice(0, 12);

  return {
    title,
    description,
    excerpt,
    author,
    tags,
    durationSeconds,
    siteName,
    canonicalUrl,
    publishedTime,
    contentType,
  };
};

export const extractBodyText = (document: Document) => {
  const clone = document.body?.cloneNode(true) as HTMLElement | null;
  if (!clone) return "";

  clone
    .querySelectorAll("script, style, noscript, nav, footer, header, aside, form, dialog, svg, button")
    .forEach((node) => node.remove());

  return normalizeWhitespace(clone.textContent || "");
};

