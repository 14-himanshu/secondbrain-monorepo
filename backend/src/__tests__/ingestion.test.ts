import assert from "node:assert/strict";
import test from "node:test";
import { buildDeterministicDescription, shouldUseAiSynthesis } from "../services/ingestion/classification.js";
import { normalizeUrl, detectPlatform } from "../services/ingestion/url.js";
import { assessExtractionQuality } from "../services/ingestion/validation.js";
import type { ExtractedContent } from "../services/ingestion/types.js";

test("normalizeUrl canonicalizes YouTube URLs to video id", () => {
  const watch = normalizeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=43s&list=abc");
  const short = normalizeUrl("https://youtu.be/dQw4w9WgXcQ?si=test");
  const shorts = normalizeUrl("https://youtube.com/shorts/dQw4w9WgXcQ?feature=share");

  assert.equal(watch.normalizedUrl, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.equal(short.normalizedUrl, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.equal(shorts.normalizedUrl, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
});

test("detectPlatform identifies configured platforms", () => {
  assert.equal(detectPlatform("https://medium.com/some-post"), "medium");
  assert.equal(detectPlatform("https://reddit.com/r/typescript/comments/123/test"), "reddit");
  assert.equal(detectPlatform("https://x.com/openai/status/123"), "twitter");
  assert.equal(detectPlatform("https://www.notion.so/workspace/page-abcdefabcdefabcdefabcdefabcdefab"), "notion");
  assert.equal(detectPlatform("https://example.com/blog"), "generic");
});

test("quality validation rejects noisy fallback content", () => {
  const noisy = assessExtractionQuality(
    "Sign in Home Shorts Subscriptions Recommended videos Accept cookies Privacy policy Watch full video",
    "body-fallback",
    "youtube"
  );

  assert.equal(noisy.passed, false);
  assert.ok(noisy.issues.includes("navigation-noise"));
});

test("AI synthesis only runs on validated high-confidence extraction", () => {
  const extraction: ExtractedContent = {
    platform: "youtube",
    normalizedUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    source: "youtube-transcript",
    sourceType: "public_source",
    confidence: 0.95,
    wordCount: 160,
    extractionQuality: "high",
    cacheable: true,
    content: "This is a long transcript with enough words to clear the minimum threshold. ".repeat(20),
    metadata: {
      title: "Sample video",
      description: "Sample description",
      tags: ["sample"],
      contentType: "video",
    },
    validation: {
      passed: true,
      issues: [],
      score: 0.95,
      wordCount: 160,
    },
    contentType: "video",
  };

  assert.equal(shouldUseAiSynthesis(extraction, "deep"), true);
  assert.equal(shouldUseAiSynthesis({ ...extraction, confidence: 0.45 }, "deep"), false);
  assert.equal(shouldUseAiSynthesis(extraction, "quick"), false);
});

test("deterministic description preserves a short summary and bullets", () => {
  const description = buildDeterministicDescription({
    platform: "generic",
    normalizedUrl: "https://example.com/post",
    source: "readability",
    sourceType: "public_source",
    confidence: 0.85,
    wordCount: 30,
    extractionQuality: "medium",
    cacheable: true,
    content:
      "First sentence explains the article. Second sentence adds context. Third sentence finishes the main idea cleanly.",
    metadata: {
      title: "An article",
      description: "A concise description.",
      tags: ["article"],
      contentType: "article",
    },
    validation: {
      passed: true,
      issues: [],
      score: 0.9,
      wordCount: 30,
    },
    contentType: "post",
  });

  assert.ok(description.startsWith("A concise description."));
  assert.ok(description.includes("MAIN IDEAS:"));
});
