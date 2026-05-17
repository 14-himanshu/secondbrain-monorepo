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

