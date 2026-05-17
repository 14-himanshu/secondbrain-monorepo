import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Content } from "./useContent";
import { deleteContentById, updateContent } from "../services/content.api";
import { queryKeys } from "../lib/queryKeys";

export function useContentMutations() {
  const queryClient = useQueryClient();

  // 1. DELETE MUTATION
  const deleteMutation = useMutation({
    mutationFn: async (contentId: string) => {
      await deleteContentById(contentId);
    },
    // Optimistic Update
    onMutate: async (contentId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.content });
      const previousContent = queryClient.getQueryData<Content[]>(queryKeys.content);
      
      queryClient.setQueryData<Content[]>(queryKeys.content, (old) => 
        old ? old.filter(c => c._id !== contentId) : []
      );

      return { previousContent };
    },
    onError: (err, _, context) => {
      if (context?.previousContent) {
        queryClient.setQueryData(queryKeys.content, context.previousContent);
      }
      console.error("Delete failed:", err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content });
    }
  });

  // 2. EDIT MUTATION
  const editMutation = useMutation({
    mutationFn: async ({ contentId, title }: { contentId: string; title: string }) => {
      await updateContent({ contentId, title });
    },
    onMutate: async ({ contentId, title }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.content });
      const previousContent = queryClient.getQueryData<Content[]>(queryKeys.content);

      queryClient.setQueryData<Content[]>(queryKeys.content, (old) => 
        old ? old.map(c => c._id === contentId ? { ...c, title } : c) : []
      );

      return { previousContent };
    },
    onError: (err, __, context) => {
      if (context?.previousContent) {
        queryClient.setQueryData(queryKeys.content, context.previousContent);
      }
      console.error("Edit failed:", err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content });
    }
  });

  return {
    deleteContent: deleteMutation.mutate,
    editContent: editMutation.mutate,
    isDeleting: deleteMutation.isPending,
    isEditing: editMutation.isPending,
  };
}
