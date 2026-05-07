import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { BACKEND_URL } from "../config";
import type { Content } from "./useContent";

export function useContentMutations() {
  const queryClient = useQueryClient();

  // 1. DELETE MUTATION
  const deleteMutation = useMutation({
    mutationFn: async (contentId: string) => {
      await axios.delete(`${BACKEND_URL}/api/v1/content`, {
        data: { contentId },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
    },
    // Optimistic Update
    onMutate: async (contentId) => {
      await queryClient.cancelQueries({ queryKey: ["content"] });
      const previousContent = queryClient.getQueryData<Content[]>(["content"]);
      
      queryClient.setQueryData<Content[]>(["content"], (old) => 
        old ? old.filter(c => c._id !== contentId) : []
      );

      return { previousContent };
    },
    onError: (err, _, context) => {
      if (context?.previousContent) {
        queryClient.setQueryData(["content"], context.previousContent);
      }
      console.error("Delete failed:", err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["content"] });
    }
  });

  // 2. EDIT MUTATION
  const editMutation = useMutation({
    mutationFn: async ({ contentId, title }: { contentId: string; title: string }) => {
      await axios.put(`${BACKEND_URL}/api/v1/content`, 
        { contentId, title },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
    },
    onMutate: async ({ contentId, title }) => {
      await queryClient.cancelQueries({ queryKey: ["content"] });
      const previousContent = queryClient.getQueryData<Content[]>(["content"]);

      queryClient.setQueryData<Content[]>(["content"], (old) => 
        old ? old.map(c => c._id === contentId ? { ...c, title } : c) : []
      );

      return { previousContent };
    },
    onError: (err, __, context) => {
      if (context?.previousContent) {
        queryClient.setQueryData(["content"], context.previousContent);
      }
      console.error("Edit failed:", err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["content"] });
    }
  });

  return {
    deleteContent: deleteMutation.mutate,
    editContent: editMutation.mutate,
    isDeleting: deleteMutation.isPending,
    isEditing: editMutation.isPending,
  };
}
