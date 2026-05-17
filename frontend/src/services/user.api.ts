import { apiClient } from "../lib/apiClient";

export const getMe = async () => {
  const res = await apiClient.get('/api/v1/me');
  return res.data;
};
