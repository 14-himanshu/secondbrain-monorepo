import { apiClient } from "../lib/apiClient";
import type { ContentDto, ContentType } from "@secondbrain/contracts";

export const getContent = async () => {
  const response = await apiClient.get<{ content: ContentDto[] }>("/api/v1/content");
  return response.data.content;
};

export const createContent = async (payload: {
  title: string;
  link: string;
  type: ContentType;
  tags: string[];
  description?: string;
}) => {
  const response = await apiClient.post("/api/v1/content", payload);
  return response.data;
};

export const updateContent = async (payload: {
  contentId: string;
  title?: string;
  description?: string;
  tags?: string[];
}) => {
  const response = await apiClient.put("/api/v1/content", payload);
  return response.data;
};

export const deleteContentById = async (contentId: string) => {
  await apiClient.delete("/api/v1/content", { data: { contentId } });
};

export const semanticSearch = async (query: string) => {
  const response = await apiClient.get<{ results: ContentDto[] }>("/api/v1/search", {
    params: { q: query },
  });
  return response.data.results;
};

export const getConnections = async (contentId: string) => {
  const response = await apiClient.get<{ connections: Array<{ _id: string; title: string; link: string; similarity: number }> }>(
    `/api/v1/content/${contentId}/connections`
  );
  return response.data.connections;
};

