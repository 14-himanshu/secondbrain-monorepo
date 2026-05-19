import { apiClient } from "../lib/apiClient";

/**
 * AI Service
 * Centralizes all AI-related API interactions.
 */

/**
 * AI Service Endpoints
 */
export const AI_ENDPOINTS = {
  REPROCESS: "/api/v1/ai/reprocess",
  TAG: "/api/v1/ai/tag",
  CHAT: "/api/v1/ai/chat",
};

export const aiService = {
  /**
   * Triggers manual re-analysis for a note.
   */
  reprocessNote: async (contentId: string) => {
    return apiClient.post(AI_ENDPOINTS.REPROCESS, { contentId });
  },

  /**
   * Auto-tags a URL.
   */
  getTags: async (url: string) => {
    return apiClient.post(AI_ENDPOINTS.TAG, { url }, { timeout: 60000 });
  },

  chat: async (payload: {
    query: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
    contentId?: string;
  }) => {
    return apiClient.post(AI_ENDPOINTS.CHAT, payload, { timeout: 15000 });
  },
};
