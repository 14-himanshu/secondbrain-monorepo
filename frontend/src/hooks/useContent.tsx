import axios from "axios";
import { useEffect, useState } from "react";
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

  async function refresh() {
    console.log("Refreshing content...");
    try {
      const response = await axios.get(`${BACKEND_URL}/api/v1/content`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      console.log("Fetched content:", response.data.content);
      setContents(response.data.content || []);
    } catch (error) {
      console.error("Error fetching content:", error);
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(() => {
      refresh();
    }, 10 * 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  return { contents, refresh, setContents };
}