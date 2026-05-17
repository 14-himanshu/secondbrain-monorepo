import { apiClient } from "../lib/apiClient";
import type { ContentDto, ShareType } from "@secondbrain/contracts";

export const getShareStatus = async () => {
  const response = await apiClient.get<{ shareType: ShareType; shareId: string | null }>(
    "/api/brain/share-status"
  );
  return response.data;
};

export const updateShare = async (shareType: ShareType, regenerate = false) => {
  const response = await apiClient.post<{ shareType: ShareType; shareId: string | null }>(
    "/api/brain/share",
    { shareType, regenerate }
  );
  return response.data;
};

export const getPublicBrain = async (shareId: string) => {
  const response = await apiClient.get<{ username: string; content: ContentDto[] }>(
    `/api/brain/share/${shareId}`
  );
  return response.data;
};

