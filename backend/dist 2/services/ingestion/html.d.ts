import { JSDOM } from "jsdom";
import type { StructuredMetadata } from "./types.js";
export declare const REQUEST_HEADERS: {
    "User-Agent": string;
    Accept: string;
    "Accept-Language": string;
    "Cache-Control": string;
};
export declare const normalizeWhitespace: (value: string) => string;
export declare const parseIsoDurationToSeconds: (value?: string) => number | undefined;
export declare const createDom: (html: string, url: string) => JSDOM;
export declare const fetchTextResponse: (url: string, timeoutMs?: number) => Promise<{
    finalUrl: string;
    contentType: string;
    body: string;
}>;
export declare const fetchJsonResponse: <T>(url: string, timeoutMs?: number) => Promise<T>;
export declare const extractJsonLd: (document: Document) => Record<string, any>[];
export declare const mergeStructuredMetadata: (...sources: Array<Partial<StructuredMetadata> | undefined>) => StructuredMetadata;
export declare const extractStructuredMetadata: (document: Document) => StructuredMetadata;
export declare const extractBodyText: (document: Document) => string;
//# sourceMappingURL=html.d.ts.map