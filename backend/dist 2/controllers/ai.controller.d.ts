import type { Request, Response } from "express";
export declare const aiChatController: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * AI Tag Controller
 * Handles auto-classification of URLs.
 * Returns structured error responses for frontend resilience.
 */
export declare const aiTagController: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * AI Reprocess Controller
 * Manually triggers AI analysis for a specific piece of content.
 */
export declare const aiReprocessController: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * AI Insights Controller (Production Grade)
 * Orchestrates deterministic analytics, semantic clustering, and LLM synthesis with advanced caching.
 */
export declare const aiInsightsController: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=ai.controller.d.ts.map