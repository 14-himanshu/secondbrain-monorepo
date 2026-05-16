import type { Platform, UrlTarget } from "./types.js";

const TRACKING_PARAMS = new Set([
  "feature",
  "si",
  "t",
  "time_continue",
  "start",
  "index",
  "list",
  "pp",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
  "fbclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
  "spm",
  "s",
]);

const pruneTrackingParams = (url: URL) => {
  for (const key of Array.from(url.searchParams.keys())) {
    if (TRACKING_PARAMS.has(key) || key.startsWith("utm_")) {
      url.searchParams.delete(key);
    }
  }
};

const normalizePath = (pathname: string) => {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed || "/";
};

const getYouTubeVideoId = (url: URL) => {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] || undefined;
  }

  if (!host.includes("youtube.com")) {
    return undefined;
  }

  if (url.pathname === "/watch") {
    return url.searchParams.get("v") || undefined;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") {
    return parts[1] || undefined;
  }

  return undefined;
};

export const detectPlatform = (value: string | URL): Platform => {
  const url = typeof value === "string" ? new URL(value) : value;
  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be" || host.includes("youtube.com")) return "youtube";
  if (host.includes("medium.com")) return "medium";
  if (host === "redd.it" || host.includes("reddit.com")) return "reddit";
  if (host === "x.com" || host.includes("twitter.com")) return "twitter";
  return "generic";
};

export const normalizeUrl = (rawUrl: string): UrlTarget => {
  const url = new URL(rawUrl);
  const platform = detectPlatform(url);

  url.hash = "";

  if (platform === "youtube") {
    const videoId = getYouTubeVideoId(url);
    const normalizedUrl = videoId
      ? `https://www.youtube.com/watch?v=${videoId}`
      : `https://www.youtube.com${normalizePath(url.pathname)}`;

    return {
      rawUrl,
      normalizedUrl,
      cacheKey: videoId ? `youtube:${videoId}` : `youtube:${normalizedUrl}`,
      platform,
      url,
      videoId,
    };
  }

  if (platform === "twitter") {
    const host = "x.com";
    const statusMatch = normalizePath(url.pathname).match(/^\/([^/]+)\/status\/(\d+)/);
    const normalizedPath = statusMatch
      ? `/${statusMatch[1]}/status/${statusMatch[2]}`
      : normalizePath(url.pathname);

    return {
      rawUrl,
      normalizedUrl: `https://${host}${normalizedPath}`,
      cacheKey: `twitter:${normalizedPath}`,
      platform,
      url,
    };
  }

  pruneTrackingParams(url);
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const path = normalizePath(url.pathname.replace(/\.json$/, ""));
  const sortedParams = Array.from(url.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b));
  const search = sortedParams.length > 0 ? `?${new URLSearchParams(sortedParams).toString()}` : "";
  const normalizedUrl = `${url.protocol}//${host}${path}${search}`;

  return {
    rawUrl,
    normalizedUrl,
    cacheKey: `${platform}:${normalizedUrl}`,
    platform,
    url,
  };
};

