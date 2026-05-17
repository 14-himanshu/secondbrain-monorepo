import { apiClient } from "../lib/apiClient";

export const connectGoogle = async () => {
  const res = await apiClient.get<{ authUrl: string }>("/api/v1/integrations/google/connect");
  return res.data.authUrl;
};

export const getGoogleStatus = async () => {
  const res = await apiClient.get("/api/v1/integrations/google/status");
  return res.data;
};

export const disconnectGoogle = async () => {
  const res = await apiClient.post("/api/v1/integrations/google/disconnect");
  return res.data;
};
