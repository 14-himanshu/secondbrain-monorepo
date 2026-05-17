import { apiClient } from "../lib/apiClient";
import { BACKEND_URL } from "../config";
import type { ValidationIssue } from "@secondbrain/contracts";

export const signIn = async (username: string, password: string) => {
  const response = await apiClient.post<{ token: string }>("/api/v1/signin", {
    username,
    password,
  });
  return response.data;
};

export const signUp = async (username: string, password: string) => {
  const response = await apiClient.post<{ message: string; errors?: ValidationIssue[] }>(
    "/api/v1/signup",
    { username, password }
  );
  return response.data;
};

// IMPORTANT: OAuth start must be done via top-level navigation (not XHR).
// Return the backend start URL so callers can perform a full-page redirect.
export const startGoogleSignin = async () => {
  return `${BACKEND_URL}/api/v1/auth/google/start`;
};

export const exchangeLoginCode = async (code: string) => {
  const res = await apiClient.post("/api/v1/auth/exchange", { code });
  return res.data;
};
