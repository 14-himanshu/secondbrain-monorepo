import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { BACKEND_URL } from "../config";

interface Content {
  _id: string;
  title: string;
  link: string;
  type: string;
  tags?: string[];
  userId: string;
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

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { contents, refresh, setContents };
}