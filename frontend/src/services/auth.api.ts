import { apiClient } from "../lib/apiClient";
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

export const startGoogleSignin = async () => {
  const res = await apiClient.get<{ authUrl: string }>("/api/v1/auth/google/start");
  return res.data.authUrl;
};

export const exchangeLoginCode = async (code: string) => {
  const res = await apiClient.post("/api/v1/auth/exchange", { code });
  return res.data;
};
