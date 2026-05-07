import axios from "axios";
import { BACKEND_URL } from "../config";
import { useQuery } from "@tanstack/react-query";

export interface Content {
  _id: string;
  title: string;
  link: string;
  type: string;
  tags?: string[];
  userId: string;
  embeddingStatus?: "pending" | "completed" | "failed";
  aiStatus?: "queued" | "processing" | "summarized" | "completed" | "failed";
  aiMetadata?: {
    domain?: string;
    source?: string;
    contentType?: string;
    estimatedTopics?: string[];
  };
  aiError?: string;
  description?: string;
  topics?: string[];
}

export function useContent() {
  const { data, refetch, isLoading, isError } = useQuery({
    queryKey: ["content"],
    queryFn: async () => {
      const response = await axios.get(`${BACKEND_URL}/api/v1/content`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      return response.data.content as Content[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return { 
    contents: data || [], 
    refresh: refetch, 
    isLoading, 
    isError 
  };
}