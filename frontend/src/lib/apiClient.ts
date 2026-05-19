import axios, { AxiosError } from "axios";
import { API_TIMEOUT_MS, BACKEND_URL } from "../config";

export type ApiError = {
  status?: number;
  code?: string;
  message: string;
  details?: unknown;
};

export const apiClient = axios.create({
  baseURL: BACKEND_URL,
  timeout: API_TIMEOUT_MS,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const payload = error.response?.data as { message?: string } | undefined;
    const normalized: ApiError = {
      status: error.response?.status,
      code: error.code,
      message: payload?.message || error.message || "Request failed",
      details: error.response?.data,
    };
    return Promise.reject(normalized);
  }
);

export const isApiError = (value: unknown): value is ApiError =>
  value !== null && typeof value === "object" && "message" in value;
