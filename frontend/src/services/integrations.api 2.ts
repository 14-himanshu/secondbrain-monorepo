import { apiClient } from "../lib/apiClient";

export const getIntegrationStatus = async (provider: string) => {
  const res = await apiClient.get(`/api/v1/integrations/${provider}/status`);
  return res.data;
};

export const connectIntegration = async (provider: string) => {
  const res = await apiClient.get<{ authUrl: string }>(`/api/v1/integrations/${provider}/connect`);
  return res.data.authUrl;
};

export const disconnectIntegration = async (provider: string) => {
  const res = await apiClient.post(`/api/v1/integrations/${provider}/disconnect`);
  return res.data;
};