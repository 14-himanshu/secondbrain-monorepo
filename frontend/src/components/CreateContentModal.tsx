import { useState } from "react";
import { aiService } from "../services/ai.service";
import { createContent } from "../services/content.api";
import { isApiError } from "../lib/apiClient";
import type { ContentType } from "@secondbrain/contracts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ContentTypeEnum = {
  Video: "video",
  Post: "post",
  Document: "document",
} as const;

type ContentTypeValue = (typeof ContentTypeEnum)[keyof typeof ContentTypeEnum];

export function CreateContentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [type, setType] = useState<ContentTypeValue>(ContentTypeEnum.Video);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  
  const [description, setDescription] = useState("");
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const resetForm = () => {
    setTitle("");
    setLink("");
    setType(ContentTypeEnum.Video);
    setTags([]);
    setTagInput("");
    setDescription("");
    setIsAnalyzing(false);
    setAiError(null);
    setValidationError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  async function addContent() {
    if (!title || !link) {
      setValidationError("Please fill in all fields.");
      return;
    }
    setValidationError(null);
    try {
      await createContent({ link, title, type: type as ContentType, tags, description });
      handleClose();
    } catch (error) {
      if (isApiError(error)) {
        setValidationError(error.message || "Failed to add content.");
        return;
      }
      setValidationError("Failed to add content.");
    }
  }

  async function suggestMetadata() {
    if (!isValidUrl(link)) {
      setAiError("Invalid URL format.");
      return;
    }

    setIsAnalyzing(true);
    setAiError(null);

    try {
      const response = await aiService.getTags(link);

      const { data, success, message } = response.data;
      if (!success) {
        setAiError(message || "Fetch failed.");
        return;
      }

      const { title: sTitle, type: sType, tags: sTags } = data;
      if (sTitle) setTitle(sTitle);
      if (sType) setType(sType);
      if (sTags) setTags(sTags);
      
    } catch {
      setAiError("Couldn't fetch details. Try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => setTags(tags.filter((t) => t !== tagToRemove));

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[460px] p-0 border border-gray-200/50 dark:border-gray-800/50 bg-white/95 dark:bg-[#0d0d0f]/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden flex flex-col gap-0 outline-none">
        <div className="p-6 flex flex-col gap-6">
          
          {/* Header */}
          <DialogHeader className="flex flex-row items-center gap-4 text-left p-0 m-0 border-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-100/50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 ring-1 ring-purple-100 dark:ring-purple-900/50 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Add Content</DialogTitle>
              <DialogDescription className="text-sm font-medium text-slate-700 dark:text-slate-400 mt-1">Capture and categorize your insights.</DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-5">
            {/* Source Link Section */}
            <div>
              <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Source Link</label>
              <div className={`flex items-center rounded-xl border bg-white dark:bg-[#15151a] transition-all duration-200 shadow-sm ${
                aiError ? "border-red-300 dark:border-red-800/50 ring-2 ring-red-50 dark:ring-red-900/20" : "border-gray-200 dark:border-gray-800 focus-within:border-purple-400 dark:focus-within:border-purple-600 focus-within:ring-4 focus-within:ring-purple-50 dark:focus-within:ring-purple-900/20"
              }`}>
                <div className="pl-4 pr-1 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                  </svg>
                </div>
                <input
                  value={link}
                  onChange={(e) => {
                    setLink(e.target.value);
                    if (aiError) setAiError(null);
                  }}
                  placeholder="https://..."
                  className="flex-1 px-2 py-3 outline-none text-[14px] font-medium text-slate-900 dark:text-slate-200 bg-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <button
                  onClick={suggestMetadata}
                  disabled={isAnalyzing || !link}
                  className="px-4 py-3 text-[12px] font-bold text-[#6f63d9] dark:text-[#8378e8] hover:text-white hover:bg-[#6f63d9] disabled:text-slate-300 dark:disabled:text-slate-600 disabled:hover:bg-transparent transition-colors border-l border-gray-100 dark:border-gray-800 rounded-r-xl active:scale-[0.98]"
                >
                  {isAnalyzing ? (
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : "Auto-fill"}
                </button>
              </div>
              {aiError && (
                <p className="mt-2 text-[11px] text-red-500 font-bold flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                  {aiError} 
                  <button onClick={suggestMetadata} className="text-slate-500 hover:text-red-600 underline decoration-red-200">Retry</button>
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Title</label>
              <div className="relative group">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What is this about?"
                  className="w-full bg-white dark:bg-[#15151a] px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 focus:border-purple-400 dark:focus:border-purple-600 focus:ring-4 focus:ring-purple-50 dark:focus:ring-purple-900/20 outline-none transition-all duration-200 text-[14px] font-medium text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm"
                />
              </div>
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Category</label>
              <div className="grid grid-cols-3 gap-3">
                {(Object.entries(ContentTypeEnum) as [string, ContentTypeValue][]).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => setType(value)}
                    className={`py-2.5 rounded-xl text-[12px] font-bold tracking-wide transition-all duration-300 active:scale-95 border-2 ${
                      type === value 
                        ? "bg-purple-50/80 dark:bg-purple-900/30 border-purple-300 dark:border-purple-600/50 text-[#6f63d9] dark:text-[#8378e8] shadow-sm" 
                        : "bg-white dark:bg-[#15151a] border-gray-100 dark:border-gray-800/80 text-slate-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-700 shadow-sm"
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Tags</label>
              
              <div className="flex flex-wrap gap-2 mb-3 empty:hidden">
                {tags.map((tag) => (
                  <span key={tag} className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1.5 rounded-lg text-[11px] font-bold tracking-wide flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
                    #{tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-red-500 dark:hover:text-red-400 transition-colors p-0.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3 h-3">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              
              <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#15151a] shadow-sm focus-within:border-purple-400 dark:focus-within:border-purple-600 focus-within:ring-4 focus-within:ring-purple-50 dark:focus-within:ring-purple-900/20 transition-all duration-200">
                <div className="pl-4 pr-1 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                  </svg>
                </div>
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Add tags (press Enter)..."
                  className="flex-1 px-2 py-3 outline-none text-[14px] font-medium text-slate-900 dark:text-slate-200 bg-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
                      setTags([...tags, tagInput.trim()]);
                      setTagInput("");
                    }
                  }}
                  disabled={!tagInput.trim()}
                  className="px-4 py-3 text-[12px] font-bold text-slate-500 dark:text-slate-400 hover:text-[#6f63d9] dark:hover:text-[#8378e8] disabled:text-slate-300 dark:disabled:text-slate-600 transition-colors border-l border-gray-100 dark:border-gray-800"
                  title="Add tag"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>

            {validationError && (
              <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 text-red-500 mt-0.5">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
                <p className="text-red-500 text-[13px] font-medium">{validationError}</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 pt-5 border-t border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-[#0d0d0f] flex justify-end gap-3">
          <button 
            onClick={handleClose}
            className="px-5 py-2.5 rounded-xl text-[14px] font-bold text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-gray-200/50 dark:hover:bg-gray-800 transition-colors active:scale-95"
          >
            Cancel
          </button>
          <button 
            onClick={addContent}
            className="px-6 py-2.5 rounded-xl text-[14px] font-bold text-white bg-[#6f63d9] hover:bg-[#5b50b5] shadow-sm shadow-purple-500/20 transition-all active:scale-95 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
            </svg>
            Save Note
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
