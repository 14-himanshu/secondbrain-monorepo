import type { UrlTarget, ClassificationMode, ExtractedContent, ExtractContext } from "../types.js";
import { getAccessTokenForUser } from "../../google.auth.js";
import { assessExtractionQuality, adjustConfidence, deriveExtractionQuality, deriveIngestionStatus } from "../validation.js";
import * as pdfParse from "pdf-parse";
import { fetchJinaReader } from "./article.extractor.js";
import {
  createDom,
  extractStructuredMetadata,
  fetchArrayBufferResponse,
  fetchTextResponse,
  mergeStructuredMetadata,
  normalizeWhitespace,
} from "../html.js";

const DRIVE_FIELDS = "id,name,mimeType,owners,description,createdTime,modifiedTime";
const GOOGLE_LOGIN_WALL_MARKERS = [
  "request access",
  "you need access",
  "sign in to continue",
  "log in to continue",
  "this document is not published",
];
const GOOGLE_UNAVAILABLE_MARKERS = [
  "sorry, unable to open the file at this time",
  "unable to open the file at this time",
  "the file you have requested does not exist",
  "the requested file does not exist",
  "page not found",
  "there was an error opening this document",
  "unable to open file",
  "requested entity was not found",
];
const HTML_RESPONSE_MARKERS = ["<!doctype html", "<html", "<body", "<head", "<form"];
const GOOGLE_PRODUCT_SHELL_MARKERS = [
  "access google docs with a personal google account",
  "access google docs with a google workspace account",
  "to continue to google docs",
  "use guest mode to sign in privately",
  "create and edit web-based documents",
  "email or phone",
  "forgot email",
  "learn more about using guest mode",
];

type GoogleResourceKind = "doc" | "sheet" | "presentation" | "drive-file";

export const parseGoogleFileId = (url: URL): string | null => {
  const p = url.pathname;
  // docs/slides/sheets: /document|presentation|spreadsheets/d/{id}
  let m = p.match(/\/(?:document|presentation|spreadsheets)\/d\/([a-zA-Z0-9-_]+)/);
  if (m?.[1]) return m[1];
  // drive file: /file/d/{id}
  m = p.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  if (m?.[1]) return m[1];
  // query id
  const q = url.searchParams.get("id");
  if (q) return q;
  // open?id=...
  m = url.href.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (m?.[1]) return m[1];
  return null;
};

const extractTextFromGoogleDoc = (doc: any) => {
  if (!doc || !doc.body || !Array.isArray(doc.body.content)) return "";
  const parts: string[] = [];

  for (const element of doc.body.content) {
    if (element.paragraph && Array.isArray(element.paragraph.elements)) {
      const texts = element.paragraph.elements
        .map((el: any) => el.textRun && el.textRun.content ? String(el.textRun.content).trim() : "")
        .filter(Boolean);
      if (texts.length > 0) parts.push(texts.join(" "));
    } else if (element.table && Array.isArray(element.table.tableRows)) {
      // Flatten table cells
      for (const row of element.table.tableRows) {
        for (const cell of row.tableCells) {
          if (cell.content) {
            for (const c of cell.content) {
              if (c.paragraph && Array.isArray(c.paragraph.elements)) {
                const texts = c.paragraph.elements
                  .map((el: any) => el.textRun && el.textRun.content ? String(el.textRun.content).trim() : "")
                  .filter(Boolean);
                if (texts.length > 0) parts.push(texts.join(" "));
              }
            }
          }
        }
      }
    }
  }

  return parts.join("\n\n");
};

const detectGoogleResourceKind = (url: URL): GoogleResourceKind => {
  if (url.pathname.includes("/document/")) return "doc";
  if (url.pathname.includes("/spreadsheets/")) return "sheet";
  if (url.pathname.includes("/presentation/")) return "presentation";
  return "drive-file";
};

const looksLikeGoogleLoginWall = (value: string) => {
  const lower = value.toLowerCase();
  return GOOGLE_LOGIN_WALL_MARKERS.some((marker) => lower.includes(marker));
};

const looksLikeGoogleUnavailablePage = (value: string) => {
  const lower = value.toLowerCase();
  return GOOGLE_UNAVAILABLE_MARKERS.some((marker) => lower.includes(marker));
};

const looksLikeHtmlDocument = (value: string) => {
  const lower = value.toLowerCase();
  return HTML_RESPONSE_MARKERS.some((marker) => lower.includes(marker));
};

const looksLikeGoogleProductShell = (value: string) => {
  const lower = value.toLowerCase();
  return GOOGLE_PRODUCT_SHELL_MARKERS.some((marker) => lower.includes(marker));
};

const shouldRejectGoogleTextPayload = (value: string, contentType?: string) => {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return true;
  if (
    looksLikeGoogleLoginWall(normalized) ||
    looksLikeGoogleUnavailablePage(normalized) ||
    looksLikeGoogleProductShell(normalized)
  ) {
    return true;
  }

  const loweredContentType = String(contentType || "").toLowerCase();
  if (loweredContentType.includes("text/html") && looksLikeHtmlDocument(value)) {
    return true;
  }

  return false;
};

const bufferStartsWithPdfSignature = (buffer: ArrayBuffer) =>
  Buffer.from(buffer).subarray(0, 5).toString("utf8") === "%PDF-";

const decodeBufferSnippet = (buffer: ArrayBuffer, maxBytes = 4096) =>
  Buffer.from(buffer).subarray(0, maxBytes).toString("utf8");

const getGoogleResourceDefaults = (kind: GoogleResourceKind) => ({
  title:
    kind === "doc"
      ? "Google Doc"
      : kind === "sheet"
        ? "Google Sheet"
        : kind === "presentation"
          ? "Google Slides"
          : "Google Drive File",
  tags: [
    "google",
    kind === "doc" ? "docs" : kind === "sheet" ? "sheets" : kind === "presentation" ? "slides" : "drive",
    "public",
  ],
});

const getGoogleSourceForKind = (kind: GoogleResourceKind): ExtractedContent["source"] => {
  if (kind === "doc") return "google-docs";
  if (kind === "presentation") return "google-pdf";
  return "google-drive";
};

const getRenderedPartialReasonForKind = (kind: GoogleResourceKind) => {
  if (kind === "doc") return "public_doc_render_partial";
  if (kind === "sheet") return "public_sheet_render_partial";
  if (kind === "presentation") return "public_slides_render_partial";
  return "public_google_render_partial";
};

const safeMetadataFromHtml = async (
  url: string,
  defaults: { title: string; tags: string[] }
) => {
  try {
    const fetched = await fetchTextResponse(url, 8000);
    const dom = createDom(fetched.body, fetched.finalUrl);
    return mergeStructuredMetadata(extractStructuredMetadata(dom.window.document), {
      title: defaults.title,
      tags: defaults.tags,
      contentType: "document",
    });
  } catch {
    return {
      title: defaults.title,
      tags: defaults.tags,
      contentType: "document",
    };
  }
};

const parsePdfBufferToText = async (buffer: ArrayBuffer) => {
  const pdfLib: any = (pdfParse as any).default || (pdfParse as any);
  const parsed: any = await pdfLib(Buffer.from(buffer));
  return normalizeWhitespace(String(parsed.text || "")).slice(0, 40000);
};

const buildPublicGoogleSuccess = (
  target: UrlTarget,
  source: ExtractedContent["source"],
  content: string,
  metadata: ExtractedContent["metadata"],
  acquisitionMethod: ExtractedContent["acquisitionMethod"],
  confidenceBase: number,
  partialReason?: string
): ExtractedContent => {
  const validation = assessExtractionQuality(content, source, target.platform as any);
  const ingestionStatus = deriveIngestionStatus(source, validation, "public_source");

  return {
    platform: target.platform,
    normalizedUrl: target.normalizedUrl,
    source,
    sourceType: "public_source",
    ingestionStatus,
    ingestionReason: partialReason && ingestionStatus !== "full_extraction" ? partialReason : undefined,
    acquisitionMethod,
    confidence: adjustConfidence(confidenceBase, validation),
    wordCount: validation.wordCount,
    extractionQuality: deriveExtractionQuality(validation, "public_source"),
    cacheable: validation.passed,
    content,
    metadata,
    validation,
    contentType: "document",
  };
};

const tryRenderedGoogleExtraction = async (
  target: UrlTarget,
  kind: GoogleResourceKind
): Promise<ExtractedContent | null> => {
  const rendered = await fetchJinaReader(target.normalizedUrl);

  if (
    !rendered?.text ||
    looksLikeGoogleLoginWall(rendered.text) ||
    looksLikeGoogleUnavailablePage(rendered.text) ||
    looksLikeGoogleProductShell(rendered.text)
  ) {
    return null;
  }

  const renderedText = normalizeWhitespace(rendered.text).slice(0, 40000);
  if (!renderedText) return null;

  const defaults = getGoogleResourceDefaults(kind);
  const metadata = {
    title: rendered.title || defaults.title,
    description: rendered.description,
    tags: defaults.tags,
    contentType: "document" as const,
  };

  return buildPublicGoogleSuccess(
    target,
    getGoogleSourceForKind(kind),
    renderedText,
    metadata,
    "static_fetch",
    0.74,
    getRenderedPartialReasonForKind(kind)
  );
};

const tryPublicGoogleExtraction = async (
  target: UrlTarget,
  fileId: string,
  options?: { allowRenderedFallback?: boolean }
): Promise<ExtractedContent | null> => {
  const kind = detectGoogleResourceKind(target.url);
  const defaults = getGoogleResourceDefaults(kind);

  try {
    if (kind === "doc") {
      const exported = await fetchTextResponse(`https://docs.google.com/document/d/${fileId}/export?format=txt`, 9000);
      const text = normalizeWhitespace(exported.body).slice(0, 40000);
      if (text && !shouldRejectGoogleTextPayload(exported.body, exported.contentType)) {
        const metadata = await safeMetadataFromHtml(target.normalizedUrl, defaults);
        return buildPublicGoogleSuccess(
          target,
          "google-docs",
          text,
          metadata,
          "file_download",
          0.9,
          "public_doc_export_partial"
        );
      }
    }

    if (kind === "sheet") {
      const exported = await fetchTextResponse(`https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`, 9000);
      const csv = normalizeWhitespace(exported.body).slice(0, 40000);
      if (csv && !shouldRejectGoogleTextPayload(exported.body, exported.contentType)) {
        const metadata = await safeMetadataFromHtml(target.normalizedUrl, defaults);
        return buildPublicGoogleSuccess(
          target,
          "google-drive",
          csv,
          metadata,
          "file_download",
          0.82,
          "public_sheet_export_partial"
        );
      }
    }

    if (kind === "presentation") {
      const exported = await fetchArrayBufferResponse(`https://docs.google.com/presentation/d/${fileId}/export/pdf`, 12000);
      const text = await parsePdfBufferToText(exported.body);
      if (text && !looksLikeGoogleLoginWall(text) && !looksLikeGoogleUnavailablePage(text)) {
        const metadata = await safeMetadataFromHtml(target.normalizedUrl, defaults);
        return buildPublicGoogleSuccess(
          target,
          "google-pdf",
          text,
          metadata,
          "file_download",
          0.82,
          "public_slides_export_partial"
        );
      }
    }

    if (kind === "drive-file") {
      try {
        const downloaded = await fetchArrayBufferResponse(`https://drive.google.com/uc?export=download&id=${fileId}`, 12000);
        const contentType = downloaded.contentType.toLowerCase();

        if (contentType.includes("application/pdf")) {
          const text = await parsePdfBufferToText(downloaded.body);
          if (text) {
            const metadata = await safeMetadataFromHtml(target.normalizedUrl, defaults);
            return buildPublicGoogleSuccess(
              target,
              "google-pdf",
              text,
              metadata,
              "file_download",
              0.8,
              "public_drive_pdf_partial"
            );
          }
        }

        if (contentType.startsWith("text/") || contentType.includes("json") || contentType.includes("xml")) {
          const text = normalizeWhitespace(Buffer.from(downloaded.body).toString("utf8")).slice(0, 40000);
          if (text && !shouldRejectGoogleTextPayload(text, contentType)) {
            const metadata = await safeMetadataFromHtml(target.normalizedUrl, defaults);
            return buildPublicGoogleSuccess(
              target,
              "google-drive",
              text,
              metadata,
              "file_download",
              0.78,
              "public_drive_text_partial"
            );
          }
        }
      } catch {
        // Fall through to rendered fallback below.
      }
    }
  } catch {
    // Public export/download is optional. Continue to rendered fallback.
  }

  if (!options?.allowRenderedFallback) {
    return null;
  }

  return tryRenderedGoogleExtraction(target, kind);
};

const buildGoogleFailure = (
  target: UrlTarget,
  source: ExtractedContent["source"],
  reason: string,
  description: string,
  tags: string[] = ["google", "extraction_failed"]
): ExtractedContent => {
  const validation = assessExtractionQuality("", "unavailable", target.platform as any);
  return {
    platform: target.platform,
    normalizedUrl: target.normalizedUrl,
    source,
    sourceType: "protected_source",
    ingestionStatus: "failed",
    ingestionReason: reason,
    acquisitionMethod: "api",
    confidence: 0.05,
    wordCount: validation.wordCount,
    extractionQuality: deriveExtractionQuality(validation, "protected_source" as any),
    cacheable: false,
    content: "",
    metadata: {
      title: "Google file",
      description,
      tags,
      contentType: "document",
    },
    validation,
    contentType: "document",
  };
};

const buildGoogleAuthRequired = (
  target: UrlTarget,
  source: ExtractedContent["source"],
  reason: string,
  description: string,
  title = "Google file",
  tags: string[] = ["google", "protected"]
): ExtractedContent => {
  const validation = assessExtractionQuality("", "unavailable", target.platform as any);
  return {
    platform: target.platform,
    normalizedUrl: target.normalizedUrl,
    source,
    sourceType: "protected_source",
    ingestionStatus: "authentication_required",
    ingestionReason: reason,
    acquisitionMethod: "api",
    confidence: 0.05,
    wordCount: validation.wordCount,
    extractionQuality: deriveExtractionQuality(validation, "protected_source" as any),
    cacheable: false,
    content: "",
    metadata: {
      title,
      description,
      tags,
      contentType: "document",
    },
    validation,
    contentType: "document",
  };
};

const buildGoogleUnsupported = (
  target: UrlTarget,
  mime: string,
  title: string,
  description: string
): ExtractedContent => {
  const validation = assessExtractionQuality("", "unavailable", target.platform as any);
  return {
    platform: target.platform,
    normalizedUrl: target.normalizedUrl,
    source: "google-drive",
    sourceType: "protected_source",
    ingestionStatus: "unsupported",
    ingestionReason: `unsupported_mime:${mime}`,
    acquisitionMethod: "api",
    confidence: 0.05,
    wordCount: validation.wordCount,
    extractionQuality: deriveExtractionQuality(validation, "protected_source" as any),
    cacheable: false,
    content: "",
    metadata: {
      title,
      description,
      tags: ["google", "unsupported_google_type"],
      contentType: "document",
    },
    validation,
    contentType: "document",
  };
};

const exportGoogleWorkspaceFile = async (fileId: string, mimeType: string, accessToken: string) => {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(mimeType)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error(`GOOGLE_EXPORT_${response.status}`);
  }

  return response;
};

export const extractGoogleContent = async (
  target: UrlTarget,
  mode: ClassificationMode = "deep",
  context?: ExtractContext
): Promise<ExtractedContent> => {
  const fileId = parseGoogleFileId(target.url);
  const kind = detectGoogleResourceKind(target.url);

  if (!fileId) {
    return buildGoogleFailure(
      target,
      "unavailable",
      "invalid_google_url",
      "Unable to parse a Google file identifier from this URL.",
      ["google", "invalid_url"]
    );
  }

  const userId = context?.userId;
  const publicExtraction = await tryPublicGoogleExtraction(target, fileId, {
    allowRenderedFallback: !userId && mode === "deep",
  });
  if (publicExtraction) {
    return publicExtraction;
  }

  // Ensure we have a valid userId to retrieve tokens
  if (!userId) {
    return buildGoogleAuthRequired(
      target,
      "unavailable",
      "missing_user_context",
      "This Google file was not publicly extractable. Connect Google Drive or share a public exportable version of the file."
    );
  }

  // Obtain a fresh access token for the user (this will refresh if needed)
  let accessToken: string;
  try {
    accessToken = await getAccessTokenForUser(userId);
  } catch (e) {
    const err = e as Error;
    if (err.message.includes("NO_REFRESH_OR_ACCESS_TOKEN") || err.message.includes("GOOGLE_NOT_CONNECTED")) {
      if (mode === "deep") {
        const renderedFallback = await tryRenderedGoogleExtraction(target, kind);
        if (renderedFallback) {
          return renderedFallback;
        }
      }

      return buildGoogleAuthRequired(
        target,
        "google-drive",
        "google_reauth_required",
        "Reconnect Google Drive, or connect the Google account that has access to this file.",
        "Google file",
        ["google", "requires_reauth"]
      );
    }

    return buildGoogleFailure(
      target,
      "google-drive",
      "google_api_access_failed",
      `Failed to access the Google API: ${err.message}`
    );
  }

  // Fetch file metadata
  const metaResp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=${DRIVE_FIELDS}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!metaResp.ok) {
    if (metaResp.status === 403 || metaResp.status === 401) {
      if (mode === "deep") {
        const renderedFallback = await tryRenderedGoogleExtraction(target, kind);
        if (renderedFallback) {
          return renderedFallback;
        }
      }

      return buildGoogleAuthRequired(
        target,
        "google-drive",
        "google_insufficient_permissions",
        "The connected Google account does not have access to this file. Share it with that account or connect the correct Google account.",
        "Google file",
        ["google", "insufficient_permissions"]
      );
    }

    const text = await metaResp.text().catch(() => "");
    return buildGoogleFailure(
      target,
      "google-drive",
      "google_metadata_fetch_failed",
      `Drive metadata fetch failed: ${metaResp.status} ${text}`
    );
  }

  const meta = await metaResp.json();
  const mime = meta.mimeType as string;
  const title = meta.name || "Google file";

  console.log("[GOOGLE_EXTRACTOR] fileMeta", { id: fileId, title, mime });

  try {
    if (mime === "application/vnd.google-apps.document") {
      // Use Docs API
      const docsResp = await fetch(`https://docs.googleapis.com/v1/documents/${fileId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!docsResp.ok) {
        if (docsResp.status === 403 || docsResp.status === 401) {
          if (mode === "deep") {
            const renderedFallback = await tryRenderedGoogleExtraction(target, kind);
            if (renderedFallback) {
              return renderedFallback;
            }
          }

          return buildGoogleAuthRequired(
            target,
            "google-docs",
            "google_doc_permissions_missing",
            "The connected Google account cannot read this Google Doc. Share it with that account or connect the correct Google account.",
            title,
            ["google", "insufficient_permissions"]
          );
        }
        const txt = await docsResp.text().catch(() => "");
        return buildGoogleFailure(
          target,
          "google-docs",
          "google_docs_api_error",
          `Docs API error: ${docsResp.status} ${txt}`,
          ["google", "extraction_failed"]
        );
      }

      const doc = await docsResp.json();
      const content = extractTextFromGoogleDoc(doc).slice(0, 40000);
      const validation = assessExtractionQuality(content, "google-docs", target.platform as any);
      const confidence = adjustConfidence(0.95, validation);

      return {
        platform: target.platform,
        normalizedUrl: target.normalizedUrl,
        source: "google-docs",
        sourceType: "protected_source",
        ingestionStatus: deriveIngestionStatus("google-docs", validation, "protected_source"),
        acquisitionMethod: "api",
        confidence,
        wordCount: validation.wordCount,
        extractionQuality: deriveExtractionQuality(validation, "protected_source" as any),
        cacheable: validation.passed,
        content,
        metadata: { title, description: content.slice(0, 500), tags: ["google", "docs"], contentType: "document" },
        validation,
        contentType: "document",
      };
    }

    if (mime === "application/pdf") {
      // Download file bytes
      const fileResp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!fileResp.ok) {
        if (fileResp.status === 403 || fileResp.status === 401) {
          return buildGoogleAuthRequired(
            target,
            "google-pdf",
            "google_pdf_permissions_missing",
            "The connected Google account cannot download this PDF. Share it with that account or connect the correct Google account.",
            title,
            ["google", "insufficient_permissions"]
          );
        }

        const txt = await fileResp.text().catch(() => "");
        return buildGoogleFailure(
          target,
          "google-pdf",
          "google_pdf_download_failed",
          `PDF download failed: ${fileResp.status} ${txt}`
        );
      }

      const contentType = String(fileResp.headers.get("content-type") || "").toLowerCase();
      const buffer = await fileResp.arrayBuffer();
      const previewSnippet = decodeBufferSnippet(buffer);
      const normalizedPreview = normalizeWhitespace(previewSnippet);

      if (
        (contentType.includes("text/html") || looksLikeHtmlDocument(previewSnippet)) &&
        looksLikeGoogleLoginWall(normalizedPreview)
      ) {
        return buildGoogleAuthRequired(
          target,
          "google-pdf",
          "google_pdf_preview_requires_access",
          "Google returned a preview page that still requires access. Share the file with the connected Google account or connect the correct account.",
          title,
          ["google", "insufficient_permissions"]
        );
      }

      if (
        !contentType.includes("application/pdf") &&
        !bufferStartsWithPdfSignature(buffer) &&
        normalizedPreview &&
        !looksLikeGoogleUnavailablePage(normalizedPreview)
      ) {
        if (mode === "deep") {
          const renderedPreview = await tryRenderedGoogleExtraction(target, kind);
          if (renderedPreview) {
            return renderedPreview;
          }
        }

        return buildGoogleFailure(
          target,
          "google-pdf",
          "google_pdf_unexpected_payload",
          "Google returned a PDF response that was not machine-readable. The file may be preview-only or require a different export path.",
          ["google", "extraction_failed"]
        );
      }

      try {
        const text = await parsePdfBufferToText(buffer);
        const validation = assessExtractionQuality(text, "google-pdf", target.platform as any);
        const confidence = adjustConfidence(0.75, validation);

        if (!text) {
          if (mode === "deep") {
            const renderedPreview = await tryRenderedGoogleExtraction(target, kind);
            if (renderedPreview) {
              return renderedPreview;
            }
          }

          return buildGoogleFailure(
            target,
            "google-pdf",
            "google_pdf_no_extractable_text",
            "Google downloaded the PDF, but it did not contain machine-readable text. The file may be scanned or image-only.",
            ["google", "extraction_failed"]
          );
        }

        return {
          platform: target.platform,
          normalizedUrl: target.normalizedUrl,
          source: "google-pdf",
          sourceType: "protected_source",
          ingestionStatus: deriveIngestionStatus("google-pdf", validation, "protected_source"),
          acquisitionMethod: "file_download",
          confidence,
          wordCount: validation.wordCount,
          extractionQuality: deriveExtractionQuality(validation, "protected_source" as any),
          cacheable: validation.passed,
          content: text,
          metadata: { title, description: text.slice(0, 500), tags: ["google", "pdf"], contentType: "document" },
          validation,
          contentType: "document",
        };
      } catch (e) {
        if (mode === "deep") {
          const renderedPreview = await tryRenderedGoogleExtraction(target, kind);
          if (renderedPreview) {
            return renderedPreview;
          }
        }

        return buildGoogleFailure(
          target,
          "google-pdf",
          "google_pdf_parse_failed",
          "Google returned the file, but the PDF could not be parsed reliably. The file may be scanned, malformed, or preview-only.",
          ["google", "extraction_failed"]
        );
      }
    }

    if (mime.startsWith("text/") || mime === "application/msword" || mime.includes("officedocument")) {
      // Download as text
      const fileResp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!fileResp.ok) {
        return buildGoogleFailure(
          target,
          "google-drive",
          "google_file_download_failed",
          `Failed to download file: ${fileResp.status}`
        );
      }

      const text = await fileResp.text();
      const validation = assessExtractionQuality(text, "google-drive", target.platform as any);
      const confidence = adjustConfidence(0.85, validation);
      return {
        platform: target.platform,
        normalizedUrl: target.normalizedUrl,
        source: "google-drive",
        sourceType: "protected_source",
        ingestionStatus: deriveIngestionStatus("google-drive", validation, "protected_source"),
        acquisitionMethod: "file_download",
        confidence,
        wordCount: validation.wordCount,
        extractionQuality: deriveExtractionQuality(validation, "protected_source" as any),
        cacheable: validation.passed,
        content: text.slice(0, 40000),
        metadata: { title, description: text.slice(0, 500), tags: ["google", "drive"], contentType: "document" },
        validation,
        contentType: "document",
      };
    }

    if (mime === "application/vnd.google-apps.spreadsheet") {
      try {
        const exportResp = await exportGoogleWorkspaceFile(fileId, "text/csv", accessToken);
        const csv = (await exportResp.text()).slice(0, 40000);
        const validation = assessExtractionQuality(csv, "google-drive", target.platform as any);
        return {
          platform: target.platform,
          normalizedUrl: target.normalizedUrl,
          source: "google-drive",
          sourceType: "protected_source",
          ingestionStatus: deriveIngestionStatus("google-drive", validation, "protected_source"),
          ingestionReason: validation.passed ? undefined : "spreadsheet_export_partial",
          acquisitionMethod: "file_download",
          confidence: adjustConfidence(0.78, validation),
          wordCount: validation.wordCount,
          extractionQuality: deriveExtractionQuality(validation, "protected_source" as any),
          cacheable: validation.passed,
          content: csv,
          metadata: { title, description: csv.slice(0, 500), tags: ["google", "sheets"], contentType: "document" },
          validation,
          contentType: "document",
        };
      } catch {
        return buildGoogleUnsupported(
          target,
          mime,
          title,
          "Spreadsheet detected, but export did not return extractable text for this file."
        );
      }
    }

    if (mime === "application/vnd.google-apps.presentation") {
      try {
        const exportResp = await exportGoogleWorkspaceFile(fileId, "application/pdf", accessToken);
        const buffer = await exportResp.arrayBuffer();
        const pdfLib: any = (pdfParse as any).default || (pdfParse as any);
        const parsed: any = await pdfLib(Buffer.from(buffer));
        const text = String(parsed.text || "").slice(0, 40000);
        const validation = assessExtractionQuality(text, "google-pdf", target.platform as any);
        return {
          platform: target.platform,
          normalizedUrl: target.normalizedUrl,
          source: "google-pdf",
          sourceType: "protected_source",
          ingestionStatus: deriveIngestionStatus("google-pdf", validation, "protected_source"),
          ingestionReason: validation.passed ? undefined : "slides_export_partial",
          acquisitionMethod: "file_download",
          confidence: adjustConfidence(0.8, validation),
          wordCount: validation.wordCount,
          extractionQuality: deriveExtractionQuality(validation, "protected_source" as any),
          cacheable: validation.passed,
          content: text,
          metadata: { title, description: text.slice(0, 500), tags: ["google", "slides"], contentType: "document" },
          validation,
          contentType: "document",
        };
      } catch {
        return buildGoogleUnsupported(
          target,
          mime,
          title,
          "Presentation detected, but slide text could not be exported from Google Drive."
        );
      }
    }

    if (mime.startsWith("image/")) {
      return buildGoogleUnsupported(
        target,
        mime,
        title,
        "Image OCR is not configured yet for connected Google Drive files."
      );
    }

    if (mime.startsWith("video/")) {
      return buildGoogleUnsupported(
        target,
        mime,
        title,
        "Video transcription is not configured yet for connected Google Drive files."
      );
    }

    // Fallback unsupported
    return buildGoogleUnsupported(target, mime, title, `Unsupported Google MIME type: ${mime}`);
  } catch (e: any) {
    console.error("[GOOGLE_EXTRACTOR_FAILED]", e.message);
    return buildGoogleFailure(
      target,
      "google-drive",
      "google_internal_error",
      "Extraction failed due to an internal Google ingestion error."
    );
  }
};
