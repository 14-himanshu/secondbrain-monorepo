import { DeleteIcon } from "../icons/DeleteIcon";
import { Shareicon } from "../icons/ShareIcon";
import { YouTubeIcon } from "../icons/YoutubeIcon";
import { TwitterIcon } from "../icons/TwitterIcon";
import { DocumentIcon } from "../icons/DocumentIcon";
import { useMemo, useState } from "react";

interface CardProps {
  title: string;
  link: string;
  type: "video" | "post" | "document" | string;
  status?: "pending" | "completed" | "failed" | null;
   aiStatus?: "queued" | "processing" | "summarized" | "completed" | "failed" | "scraping" | "analyzing" | "needs_manual_content";
  aiProgress?: number;
  aiMetadata?: {
    domain?: string;
    source?: string;
    contentType?: string;
    estimatedTopics?: string[];
  };
  onDelete?: () => void;
  onEdit?: (newTitle: string) => void;
  onSelect?: () => void;
  onGenerateInsight?: () => void;
  isSelected?: boolean;
  description?: string;
  similarity?: number;
}

export function Card({ title, link, type, aiStatus, aiProgress, onDelete, onEdit, onSelect, onGenerateInsight, isSelected, description, similarity }: CardProps) {
  const normalizedType = type?.toLowerCase() ?? "";
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);

  const progressWidth = useMemo(() => {
    if (!aiStatus) return 0;
    // Use true backend progress if available, otherwise fallback to stage-based estimation
    const base = aiProgress && aiProgress > 0 ? aiProgress : 
                 (aiStatus === "queued") ? 20 : 
                 aiStatus === "scraping" ? 40 : 
                 aiStatus === "analyzing" ? 75 : 95;
    return Math.min(base, 98);
  }, [aiStatus, aiProgress]);

  const isVideo    = normalizedType === "video"    || normalizedType === "youtube";
  const isPost     = normalizedType === "post"     || normalizedType === "twitter";
  const isDocument = normalizedType === "document";

  const parsedUrl = useMemo(() => {
    try {
      return new URL(link);
    } catch {
      return null;
    }
  }, [link]);

  const faviconUrl = parsedUrl ? `https://icons.duckduckgo.com/ip3/${parsedUrl.hostname}.ico` : null;
  const source = parsedUrl?.hostname.replace(/^www\./, "") ?? "link";
  const badgeLabel = isVideo ? "Video" : isPost ? "Post" : "Document";
  

  const handleSave = () => {
    if (editedTitle.trim() !== "") {
      onEdit?.(editedTitle);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedTitle(title);
    setIsEditing(false);
  };

  const [faviconError, setFaviconError] = useState(false);

  const getIcon = () => {
    if (faviconUrl && !faviconError) {
      return (
        <img 
          src={faviconUrl} 
          className="w-5 h-5 rounded-md object-contain" 
          alt="icon" 
          onError={() => setFaviconError(true)}
        />
      );
    }
    if (isVideo)    return <YouTubeIcon />;
    if (isPost)     return <TwitterIcon />;
    if (isDocument) return <DocumentIcon />;
    return <Shareicon />;
  };

  return (
    <div 
      onClick={onSelect}
      className={`group bg-white border border-gray-50 rounded-lg p-4 transition-shadow duration-200 flex flex-col h-full relative cursor-pointer ${
        isSelected 
          ? 'border-purple-100 ring-1 ring-purple-50 shadow-[0_12px_30px_-14px_rgba(124,58,237,0.06)]' 
          : 'hover:shadow-[0_8px_24px_-12px_rgba(99,102,241,0.04)]'
      }`}
    >
      
      {/* Header: Intelligence Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-50 rounded-md flex items-center justify-center border border-gray-50 transition-transform duration-150">
            {getIcon()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest leading-none mb-1">{badgeLabel}</span>
            <span className="text-[13px] font-semibold text-gray-700 truncate max-w-[180px] antialiased leading-none">{source}</span>
          </div>
        </div>
        
        {/* Pulse Indicator */}
        {description && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-50 rounded-full border border-purple-50/40">
             <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse-semantic" />
             <span className="text-[10px] font-semibold text-purple-500 uppercase tracking-tight">Synthesized</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="w-full rounded-xl border border-purple-100 bg-purple-50/20 px-4 py-2.5 text-[14px] font-bold text-gray-900 outline-none focus:ring-2 focus:ring-purple-100 transition-all"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <div className="flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); handleSave(); }} className="text-[10px] font-bold text-white px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 transition-all">Save</button>
              <button onClick={(e) => { e.stopPropagation(); handleCancel(); }} className="text-[10px] font-bold text-gray-400 hover:text-gray-600 px-3 py-1.5">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <h3 className="text-[14px] font-semibold text-gray-800 leading-[1.35] group-hover:text-purple-700 transition-colors tracking-tight line-clamp-2 antialiased" title={title}>
              {title}
            </h3>
            {/* Quick Preview */}
            {description && (
              <p className="text-[13px] text-gray-600 font-medium line-clamp-3 leading-relaxed mt-2">
                {description.split('\n\n')[0]}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Neural Progress Bar: Sleek & Sophisticated */}
      {(aiStatus && ["scraping", "analyzing", "queued", "processing"].includes(aiStatus)) && (
        <div className="mt-4 w-full h-1 bg-purple-50 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-300 via-purple-400 to-indigo-400 transition-all duration-400 ease-linear"
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      )}

      {/* Footer: Metadata & Actions */}
      <div className="pt-4 mt-4 flex items-center justify-between border-t border-gray-50">
        <div className="flex items-center gap-4">
           <div className="flex items-center">
            {aiStatus && ["queued", "processing", "summarized", "scraping", "analyzing"].includes(aiStatus) ? (
              <div className={`px-2.5 py-1 rounded-full text-[9px] font-semibold uppercase tracking-widest flex items-center gap-2 border bg-gray-50/40 border-gray-50 text-purple-500 animate-pulse`}>
                <div className="w-1.5 h-1.5 rounded-full bg-purple-300" />
                {aiStatus === "queued" ? "Thinking" : 
                 aiStatus === "scraping" ? "Reading Page" :
                 aiStatus === "analyzing" ? "Analyzing" : "Processing"}
              </div>
            ) : (aiStatus === "completed" || aiStatus === "summarized") ? (
              <div className="text-[9px] font-bold text-purple-300 uppercase tracking-[0.15em] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                {similarity ? `${Math.round(similarity * 100)}% Neural Match` : "Verified Insight"}
              </div>
            ) : aiStatus === "failed" ? (
              <div className="text-[9px] font-bold text-red-300 uppercase tracking-[0.15em]">Synthesis Failed</div>
            ) : aiStatus === "needs_manual_content" ? (
              <div className="text-[9px] font-bold text-amber-500 uppercase tracking-[0.15em]">Manual Content Needed</div>
            ) : (
              <button 
                onClick={(e) => { e.stopPropagation(); onGenerateInsight?.(); }}
                className="text-purple-600 hover:text-purple-700 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-purple-50 transition-all"
              >
                Synthesize
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Remove"
            >
              <DeleteIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
