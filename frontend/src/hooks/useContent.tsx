import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { BACKEND_URL } from "../config";

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
  const [contents, setContents] = useState<Content[]>([]);

  const refresh = useCallback(async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/v1/content`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setContents(response.data.content || []);
    } catch (error) {
      console.error("Error fetching content:", error);
    }
  }, []);

  // INITIAL LOAD
  useEffect(() => {
    refresh();
  }, [refresh]);


  return { contents, refresh, setContents };
}