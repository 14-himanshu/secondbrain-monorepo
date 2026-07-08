import { apiClient } from "../lib/apiClient";
import { BACKEND_URL } from "../config";

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
    return apiClient.post(`/api/v1/content/${contentId}/extract`);
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
    signal?: AbortSignal;
  }) => {
    // We use native fetch here instead of apiClient because Axios is poor at handling SSE streams.
    const token = localStorage.getItem("token"); // or however auth is handled
    const { signal, ...body } = payload;
    return fetch(BACKEND_URL + AI_ENDPOINTS.CHAT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ ...body, stream: true }),
      signal,
    });
  },
};
