import { useQuery } from "@tanstack/react-query";
import { getContent } from "../services/content.api";
import { queryKeys } from "../lib/queryKeys";
import type { ContentDto, AiStatus, EmbeddingStatus, IngestionStatus } from "@secondbrain/contracts";

export interface Content extends Omit<ContentDto, "aiStatus" | "embeddingStatus"> {
  embeddingStatus?: EmbeddingStatus;
  aiStatus?: AiStatus;
  aiMetadata?: {
    domain?: string;
    source?: string;
    contentType?: string;
    estimatedTopics?: string[];
    ingestionStatus?: IngestionStatus;
    ingestionReason?: string;
    acquisitionMethod?: string;
    accessRequirement?: "public" | "authenticated";
  };
  aiError?: string;
  description?: string;
  topics?: string[];
}

export function useContent() {
  const { data, refetch, isLoading, isError } = useQuery({
    queryKey: queryKeys.content,
    queryFn: async () => (await getContent()) as Content[],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return { 
    contents: data || [], 
    refresh: refetch, 
    isLoading, 
    isError 
  };
}
