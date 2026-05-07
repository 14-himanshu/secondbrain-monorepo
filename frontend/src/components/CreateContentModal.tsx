import { useState, useEffect } from "react";
import { CrossIcon } from "../icons/CrossIcon";
import { Button } from "./Button";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { aiService } from "../services/ai.service";

const ContentType = {
  Video: "video",
  Post: "post",
  Document: "document",
} as const;

type ContentTypeValue = (typeof ContentType)[keyof typeof ContentType];

/**
 * CreateContentModal Component
 * Focus: Correcting styling to align with the soft-purple design system.
 */
export function CreateContentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [type, setType] = useState<ContentTypeValue>(ContentType.Video);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!open) {
      setAiError(null);
      setIsAnalyzing(false);
      setTagInput("");
    }
  }, [open]);

  async function addContent() {
    if (!title || !link) {
      alert("Please fill in all fields");
      return;
    }
    try {
      await axios.post(
        BACKEND_URL + "/api/v1/content",
        { link, title, type, tags },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setTitle(""); setLink(""); setType(ContentType.Video); setTags([]); setTagInput("");
      onClose();
    } catch (error: any) {
      alert("Failed to add content");
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
      
    } catch (error: any) {
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
    <div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose}></div>
          
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative p-8 transition-all">
            <button onClick={onClose} className="absolute top-6 right-6 p-1 text-gray-400 hover:text-gray-600 transition-colors">
              <CrossIcon />
            </button>

            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Add Content</h2>
              <p className="text-xs text-gray-400 font-medium tracking-wide">Capture and categorize your insights.</p>
            </div>

            <div className="space-y-6">
              {/* Source Link Section */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Source Link</label>
                <div className={`flex items-center rounded-xl border transition-all ${
                  aiError ? "border-red-200" : "border-gray-200 focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-50"
                }`}>
                  <input
                    value={link}
                    onChange={(e) => {
                      setLink(e.target.value);
                      if (aiError) setAiError(null);
                    }}
                    placeholder="https://..."
                    className="flex-1 px-4 py-2.5 outline-none text-sm text-gray-700 bg-transparent placeholder:text-gray-300"
                  />
                  <button
                    onClick={suggestMetadata}
                    disabled={isAnalyzing || !link}
                    className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-purple-600 disabled:text-gray-300 transition-colors border-l border-gray-100"
                  >
                    {isAnalyzing ? (
                      <div className="w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : "Auto-fill"}
                  </button>
                </div>
                {aiError && (
                  <p className="mt-2 text-[10px] text-red-400 font-bold flex items-center gap-1.5">
                    {aiError} 
                    <button onClick={suggestMetadata} className="text-gray-400 hover:text-purple-600 underline decoration-gray-200">Retry</button>
                  </p>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-300 focus:ring-2 focus:ring-purple-50 outline-none transition-all text-sm text-gray-700 placeholder:text-gray-300"
                />
              </div>

              {/* Category Selector - FIXED STYLING */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Category</label>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.entries(ContentType) as [string, ContentTypeValue][]).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => setType(value)}
                      className={`py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${
                        type === value 
                          ? "bg-purple-50 border-purple-200 text-purple-700 shadow-sm shadow-purple-100" 
                          : "bg-white border-gray-100 text-gray-400 hover:bg-gray-50 hover:border-gray-200"
                      }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tags</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map((tag) => (
                    <span key={tag} className="bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border border-purple-100">
                      #{tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3 h-3">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Add tags..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-300 focus:ring-2 focus:ring-purple-50 outline-none transition-all text-sm text-gray-700 placeholder:text-gray-300"
                />
              </div>

              <div className="pt-2">
                <Button onClick={addContent} variant="primary" text="Save Note" fullwidth={true} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
