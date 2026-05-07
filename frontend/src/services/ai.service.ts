import axios from "axios";
import { BACKEND_URL } from "../config";

/**
 * AI Service
 * Centralizes all AI-related API interactions.
 */

/**
 * AI Service Endpoints
 */
export const AI_ENDPOINTS = {
  REPROCESS: "/reprocess",
  TAG: "/tag",
};

const aiApi = axios.create({
  baseURL: `${BACKEND_URL}/api/v1/ai`,
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

// Update token on each request in case it changed
aiApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Development logging & Enhanced Error Mapping
if (import.meta.env.DEV) {
  aiApi.interceptors.request.use((config) => {
    console.log(`[AI_API_REQUEST]: ${config.method?.toUpperCase()} ${config.url}`, config.data);
    return config;
  });

  aiApi.interceptors.response.use(
    (response) => {
      console.log(`[AI_API_SUCCESS]: ${response.config.url}`, response.data);
      return response;
    },
    (error) => {
      const status = error.response?.status;
      const message = error.response?.data?.message;

      // Map technical errors to user-friendly diagnostics
      let diagnostic = "AI processing failed.";
      if (status === 404) diagnostic = "AI processing route not found on server.";
      if (status === 429) diagnostic = "Rate limit exceeded. Please wait.";
      if (status === 500) diagnostic = message || "Internal AI synthesis error.";
      if (error.code === "ECONNABORTED") diagnostic = "Request timed out.";

      console.error(`[AI_API_ERROR] [${status || "NETWORK"}]: ${diagnostic}`, error.response?.data || error.message);
      
      // Attach diagnostic to error for component consumption
      error.diagnostic = diagnostic;
      
      return Promise.reject(error);
    }
  );
}

export const aiService = {
  /**
   * Triggers manual re-analysis for a note.
   */
  reprocessNote: async (contentId: string) => {
    return aiApi.post(AI_ENDPOINTS.REPROCESS, { contentId });
  },

  /**
   * Auto-tags a URL.
   */
  getTags: async (url: string) => {
    return aiApi.post(AI_ENDPOINTS.TAG, { url });
  },
};
