import type {
  ExtractionSource,
  Platform,
  ExtractionValidation,
  ExtractionQuality,
  SourceType,
  IngestionStatus,
} from "./types.js";

const NOISE_PHRASES = [
  "recommended videos",
  "watch full video",
  "sign in",
  "accept cookies",
  "cookie policy",
  "skip navigation",
  "log in",
  "privacy policy",
  "terms of service",
  "home shorts subscriptions",
];

const MIN_WORDS_BY_SOURCE: Record<ExtractionSource, number> = {
  "youtube-transcript": 80,
  "youtube-metadata": 20,
  "notion-api": 60,
  "google-docs": 60,
  "google-drive": 20,
  "google-pdf": 30,
  "reddit-json": 30,
  "twitter-metadata": 15,
  readability: 80,
  metadata: 20,
  "body-fallback": 80,
  unavailable: 0,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const assessExtractionQuality = (
  text: string,
  source: ExtractionSource,
  platform: Platform
): ExtractionValidation => {
  const normalized = text.trim();
  const lower = normalized.toLowerCase();
  const lines = normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const words = normalized.split(/\s+/).filter(Boolean);
  const issues: string[] = [];

  if (!normalized) {
    issues.push("empty");
  }

  if (words.length < MIN_WORDS_BY_SOURCE[source]) {
    issues.push("too-short");
  }

  const noiseHits = NOISE_PHRASES.filter((phrase) => lower.includes(phrase));
  if (noiseHits.length > 0) {
    issues.push("navigation-noise");
  }

  const uniqueLines = new Set(lines.map((line) => line.toLowerCase()));
  const uniqueRatio = lines.length > 0 ? uniqueLines.size / lines.length : 0;
  if (lines.length >= 5 && uniqueRatio < 0.6) {
    issues.push("repeated-text");
  }

  const shortLineRatio =
    lines.length > 0 ? lines.filter((line) => line.split(/\s+/).filter(Boolean).length <= 4).length / lines.length : 0;
  if (source === "body-fallback" && shortLineRatio > 0.5) {
    issues.push("navigation-heavy");
  }

  if (platform === "youtube" && source !== "youtube-transcript" && lower.includes("recommended")) {
    issues.push("recommended-content");
  }

  let score = 1;
  if (issues.includes("empty")) score -= 0.9;
  if (issues.includes("too-short")) score -= 0.35;
  if (issues.includes("navigation-noise")) score -= 0.25;
  if (issues.includes("repeated-text")) score -= 0.2;
  if (issues.includes("navigation-heavy")) score -= 0.25;
  if (issues.includes("recommended-content")) score -= 0.2;

  score = clamp(Number(score.toFixed(2)), 0, 1);

  return {
    passed: score >= 0.55 && !issues.includes("empty"),
    issues,
    score,
    wordCount: words.length,
  };
};

export const adjustConfidence = (baseConfidence: number, validation: ExtractionValidation) => {
  const penalty = validation.issues.reduce((total, issue) => {
    if (issue === "too-short") return total + 0.12;
    if (issue === "navigation-noise" || issue === "navigation-heavy") return total + 0.15;
    if (issue === "repeated-text" || issue === "recommended-content") return total + 0.1;
    if (issue === "empty") return total + 0.5;
    return total;
  }, 0);

  return clamp(Number((baseConfidence - penalty).toFixed(2)), 0.05, 0.99);
};

export const deriveExtractionQuality = (
  validation: ExtractionValidation,
  sourceType: SourceType
): ExtractionQuality => {
  if (!validation.passed || validation.score < 0.55 || validation.wordCount < 40) return "low";
  if (validation.score >= 0.82 && validation.wordCount >= 120) return "high";
  return "medium";
};

export const deriveIngestionStatus = (
  source: ExtractionSource,
  validation: ExtractionValidation,
  sourceType: SourceType
): IngestionStatus => {
  if (source === "unavailable") {
    return sourceType === "protected_source" ? "authentication_required" : "failed";
  }

  if (source === "metadata" || source.endsWith("-metadata")) {
    return validation.wordCount > 0 ? "metadata_only" : "failed";
  }

  if (
    source === "google-docs" &&
    validation.wordCount > 0 &&
    validation.issues.every((issue) => issue === "too-short")
  ) {
    return "full_extraction";
  }

  if (source === "google-docs" && validation.passed) {
    return "full_extraction";
  }

  if (validation.passed && validation.wordCount >= 80) {
    return "full_extraction";
  }

  if (validation.wordCount > 0) {
    return "partial_extraction";
  }

  return sourceType === "protected_source" ? "authentication_required" : "failed";
};
