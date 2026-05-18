import { getAccessTokenForUser } from "../../google.auth.js";
import { assessExtractionQuality, adjustConfidence, deriveExtractionQuality } from "../validation.js";
import { parse as parseUrl } from "url";
import * as pdfParse from "pdf-parse";
const DRIVE_FIELDS = "id,name,mimeType,owners,description,createdTime,modifiedTime";
export const parseGoogleFileId = (url) => {
    const p = url.pathname;
    // docs: /document/d/{id}
    let m = p.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    if (m?.[1])
        return m[1];
    // drive file: /file/d/{id}
    m = p.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (m?.[1])
        return m[1];
    // query id
    const q = url.searchParams.get("id");
    if (q)
        return q;
    // open?id=...
    m = url.href.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (m?.[1])
        return m[1];
    return null;
};
const extractTextFromGoogleDoc = (doc) => {
    if (!doc || !doc.body || !Array.isArray(doc.body.content))
        return "";
    const parts = [];
    for (const element of doc.body.content) {
        if (element.paragraph && Array.isArray(element.paragraph.elements)) {
            const texts = element.paragraph.elements
                .map((el) => el.textRun && el.textRun.content ? String(el.textRun.content).trim() : "")
                .filter(Boolean);
            if (texts.length > 0)
                parts.push(texts.join(" "));
        }
        else if (element.table && Array.isArray(element.table.tableRows)) {
            // Flatten table cells
            for (const row of element.table.tableRows) {
                for (const cell of row.tableCells) {
                    if (cell.content) {
                        for (const c of cell.content) {
                            if (c.paragraph && Array.isArray(c.paragraph.elements)) {
                                const texts = c.paragraph.elements
                                    .map((el) => el.textRun && el.textRun.content ? String(el.textRun.content).trim() : "")
                                    .filter(Boolean);
                                if (texts.length > 0)
                                    parts.push(texts.join(" "));
                            }
                        }
                    }
                }
            }
        }
    }
    return parts.join("\n\n");
};
export const extractGoogleContent = async (target, mode = "deep", context) => {
    const fileId = parseGoogleFileId(target.url);
    if (!fileId) {
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
                title: target.url.pathname.split("/").filter(Boolean).pop() || "Google file",
                description: "Unable to parse Google file id from URL",
                tags: ["google", "protected"],
                contentType: "document",
            },
            validation,
            contentType: "document",
        };
    }
    // Ensure we have a valid userId to retrieve tokens
    const userId = context?.userId;
    if (!userId) {
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
                title: "Google file",
                description: "No user context available to access authenticated Google API.",
                tags: ["google", "protected"],
                contentType: "document",
            },
            validation,
            contentType: "document",
        };
    }
    // Obtain a fresh access token for the user (this will refresh if needed)
    let accessToken;
    try {
        accessToken = await getAccessTokenForUser(userId);
    }
    catch (e) {
        // Could be invalid/expired/no-permissions
        const validation = assessExtractionQuality("", "unavailable", target.platform);
        const err = e;
        if (err.message.includes("NO_REFRESH_OR_ACCESS_TOKEN") || err.message.includes("GOOGLE_NOT_CONNECTED")) {
            return {
                platform: target.platform,
                normalizedUrl: target.normalizedUrl,
                source: "google-drive",
                sourceType: "protected_source",
                confidence: 0.05,
                wordCount: validation.wordCount,
                extractionQuality: deriveExtractionQuality(validation, "protected_source"),
                cacheable: false,
                content: "",
                metadata: {
                    title: "Google file",
                    description: "Google integration not connected or no refresh token. Reconnect to access private content.",
                    tags: ["google", "requires_reauth"],
                    contentType: "document",
                },
                validation,
                contentType: "document",
            };
        }
        return {
            platform: target.platform,
            normalizedUrl: target.normalizedUrl,
            source: "google-drive",
            sourceType: "protected_source",
            confidence: 0.05,
            wordCount: validation.wordCount,
            extractionQuality: deriveExtractionQuality(validation, "protected_source"),
            cacheable: false,
            content: "",
            metadata: {
                title: "Google file",
                description: `Failed to access Google API: ${err.message}`,
                tags: ["google", "extraction_failed"],
                contentType: "document",
            },
            validation,
            contentType: "document",
        };
    }
    // Fetch file metadata
    const metaResp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=${DRIVE_FIELDS}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaResp.ok) {
        if (metaResp.status === 403 || metaResp.status === 401) {
            const validation = assessExtractionQuality("", "unavailable", target.platform);
            return {
                platform: target.platform,
                normalizedUrl: target.normalizedUrl,
                source: "google-drive",
                sourceType: "protected_source",
                confidence: 0.05,
                wordCount: validation.wordCount,
                extractionQuality: deriveExtractionQuality(validation, "protected_source"),
                cacheable: false,
                content: "",
                metadata: {
                    title: "Google file",
                    description: "Insufficient permissions to access file. Please grant Drive permissions.",
                    tags: ["google", "insufficient_permissions"],
                    contentType: "document",
                },
                validation,
                contentType: "document",
            };
        }
        const text = await metaResp.text().catch(() => "");
        const validation = assessExtractionQuality("", "unavailable", target.platform);
        return {
            platform: target.platform,
            normalizedUrl: target.normalizedUrl,
            source: "google-drive",
            sourceType: "protected_source",
            confidence: 0.05,
            wordCount: validation.wordCount,
            extractionQuality: deriveExtractionQuality(validation, "protected_source"),
            cacheable: false,
            content: "",
            metadata: {
                title: "Google file",
                description: `Drive metadata fetch failed: ${metaResp.status} ${text}`,
                tags: ["google", "extraction_failed"],
                contentType: "document",
            },
            validation,
            contentType: "document",
        };
    }
    const meta = await metaResp.json();
    const mime = meta.mimeType;
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
                    const validation = assessExtractionQuality("", "unavailable", target.platform);
                    return {
                        platform: target.platform,
                        normalizedUrl: target.normalizedUrl,
                        source: "google-docs",
                        sourceType: "protected_source",
                        confidence: 0.05,
                        wordCount: validation.wordCount,
                        extractionQuality: deriveExtractionQuality(validation, "protected_source"),
                        cacheable: false,
                        content: "",
                        metadata: {
                            title,
                            description: "Insufficient permissions to read Google Doc.",
                            tags: ["google", "insufficient_permissions"],
                            contentType: "document",
                        },
                        validation,
                        contentType: "document",
                    };
                }
                const txt = await docsResp.text().catch(() => "");
                const validation = assessExtractionQuality("", "unavailable", target.platform);
                return {
                    platform: target.platform,
                    normalizedUrl: target.normalizedUrl,
                    source: "google-docs",
                    sourceType: "protected_source",
                    confidence: 0.05,
                    wordCount: validation.wordCount,
                    extractionQuality: deriveExtractionQuality(validation, "protected_source"),
                    cacheable: false,
                    content: "",
                    metadata: { title, description: `Docs API error: ${docsResp.status} ${txt}`, tags: ["google", "extraction_failed"], contentType: "document" },
                    validation,
                    contentType: "document",
                };
            }
            const doc = await docsResp.json();
            const content = extractTextFromGoogleDoc(doc).slice(0, 40000);
            const validation = assessExtractionQuality(content, "google-docs", target.platform);
            const confidence = adjustConfidence(0.95, validation);
            return {
                platform: target.platform,
                normalizedUrl: target.normalizedUrl,
                source: "google-docs",
                sourceType: "protected_source",
                confidence,
                wordCount: validation.wordCount,
                extractionQuality: deriveExtractionQuality(validation, "protected_source"),
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
                    const validation = assessExtractionQuality("", "unavailable", target.platform);
                    return {
                        platform: target.platform,
                        normalizedUrl: target.normalizedUrl,
                        source: "google-pdf",
                        sourceType: "protected_source",
                        confidence: 0.05,
                        wordCount: validation.wordCount,
                        extractionQuality: deriveExtractionQuality(validation, "protected_source"),
                        cacheable: false,
                        content: "",
                        metadata: { title, description: "Insufficient permissions to download PDF.", tags: ["google", "insufficient_permissions"], contentType: "document" },
                        validation,
                        contentType: "document",
                    };
                }
                const txt = await fileResp.text().catch(() => "");
                const validation = assessExtractionQuality("", "unavailable", target.platform);
                return {
                    platform: target.platform,
                    normalizedUrl: target.normalizedUrl,
                    source: "google-pdf",
                    sourceType: "protected_source",
                    confidence: 0.05,
                    wordCount: validation.wordCount,
                    extractionQuality: deriveExtractionQuality(validation, "protected_source"),
                    cacheable: false,
                    content: "",
                    metadata: { title, description: `PDF download failed: ${fileResp.status} ${txt}`, tags: ["google", "extraction_failed"], contentType: "document" },
                    validation,
                    contentType: "document",
                };
            }
            const buffer = await fileResp.arrayBuffer();
            try {
                const pdfLib = pdfParse.default || pdfParse;
                const parsed = await pdfLib(Buffer.from(buffer));
                const text = String(parsed.text || "").slice(0, 40000);
                const validation = assessExtractionQuality(text, "google-pdf", target.platform);
                const confidence = adjustConfidence(0.75, validation);
                return {
                    platform: target.platform,
                    normalizedUrl: target.normalizedUrl,
                    source: "google-pdf",
                    sourceType: "protected_source",
                    confidence,
                    wordCount: validation.wordCount,
                    extractionQuality: deriveExtractionQuality(validation, "protected_source"),
                    cacheable: validation.passed,
                    content: text,
                    metadata: { title, description: text.slice(0, 500), tags: ["google", "pdf"], contentType: "document" },
                    validation,
                    contentType: "document",
                };
            }
            catch (e) {
                const validation = assessExtractionQuality("", "unavailable", target.platform);
                return {
                    platform: target.platform,
                    normalizedUrl: target.normalizedUrl,
                    source: "google-pdf",
                    sourceType: "protected_source",
                    confidence: 0.05,
                    wordCount: validation.wordCount,
                    extractionQuality: deriveExtractionQuality(validation, "protected_source"),
                    cacheable: false,
                    content: "",
                    metadata: { title, description: "Failed to parse PDF content.", tags: ["google", "extraction_failed"], contentType: "document" },
                    validation,
                    contentType: "document",
                };
            }
        }
        if (mime.startsWith("text/") || mime === "application/msword" || mime.includes("officedocument")) {
            // Download as text
            const fileResp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!fileResp.ok) {
                const validation = assessExtractionQuality("", "unavailable", target.platform);
                return {
                    platform: target.platform,
                    normalizedUrl: target.normalizedUrl,
                    source: "google-drive",
                    sourceType: "protected_source",
                    confidence: 0.05,
                    wordCount: validation.wordCount,
                    extractionQuality: deriveExtractionQuality(validation, "protected_source"),
                    cacheable: false,
                    content: "",
                    metadata: { title, description: `Failed to download file: ${fileResp.status}`, tags: ["google", "extraction_failed"], contentType: "document" },
                    validation,
                    contentType: "document",
                };
            }
            const text = await fileResp.text();
            const validation = assessExtractionQuality(text, "google-drive", target.platform);
            const confidence = adjustConfidence(0.85, validation);
            return {
                platform: target.platform,
                normalizedUrl: target.normalizedUrl,
                source: "google-drive",
                sourceType: "protected_source",
                confidence,
                wordCount: validation.wordCount,
                extractionQuality: deriveExtractionQuality(validation, "protected_source"),
                cacheable: validation.passed,
                content: text.slice(0, 40000),
                metadata: { title, description: text.slice(0, 500), tags: ["google", "drive"], contentType: "document" },
                validation,
                contentType: "document",
            };
        }
        if (mime === "application/vnd.google-apps.spreadsheet") {
            // For spreadsheets, return metadata only
            const validation = assessExtractionQuality("", "metadata", target.platform);
            return {
                platform: target.platform,
                normalizedUrl: target.normalizedUrl,
                source: "google-drive",
                sourceType: "protected_source",
                confidence: 0.1,
                wordCount: validation.wordCount,
                extractionQuality: deriveExtractionQuality(validation, "protected_source"),
                cacheable: false,
                content: "",
                metadata: { title, description: "Spreadsheet detected. Connect and export specific sheets for content extraction.", tags: ["google", "sheets"], contentType: "document" },
                validation,
                contentType: "document",
            };
        }
        // Fallback unsupported
        const validation = assessExtractionQuality("", "unavailable", target.platform);
        return {
            platform: target.platform,
            normalizedUrl: target.normalizedUrl,
            source: "google-drive",
            sourceType: "protected_source",
            confidence: 0.05,
            wordCount: validation.wordCount,
            extractionQuality: deriveExtractionQuality(validation, "protected_source"),
            cacheable: false,
            content: "",
            metadata: { title, description: `Unsupported Google MIME type: ${mime}`, tags: ["google", "unsupported_google_type"], contentType: "document" },
            validation,
            contentType: "document",
        };
    }
    catch (e) {
        const validation = assessExtractionQuality("", "unavailable", target.platform);
        console.error("[GOOGLE_EXTRACTOR_FAILED]", e.message);
        return {
            platform: target.platform,
            normalizedUrl: target.normalizedUrl,
            source: "google-drive",
            sourceType: "protected_source",
            confidence: 0.05,
            wordCount: validation.wordCount,
            extractionQuality: deriveExtractionQuality(validation, "protected_source"),
            cacheable: false,
            content: "",
            metadata: { title, description: "Extraction failed due to internal error.", tags: ["google", "extraction_failed"], contentType: "document" },
            validation,
            contentType: "document",
        };
    }
};
//# sourceMappingURL=google.extractor.js.map