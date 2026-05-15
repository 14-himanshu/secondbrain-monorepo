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
  aiStatus?: "queued" | "processing" | "summarized" | "completed" | "failed";
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
}

export function Card({ title, link, type, aiStatus, onDelete, onEdit, onSelect, onGenerateInsight, isSelected, description }: CardProps) {
  const normalizedType = type?.toLowerCase() ?? "";
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);

  const isVideo    = normalizedType === "video"    || normalizedType === "youtube";
  const isPost     = normalizedType === "post"     || normalizedType === "twitter";
  const isDocument = normalizedType === "document";

  const parsedUrl = useMemo(() => {
    try {
      return new URL(link);
    } catch (e) {
      return null;
    }
  }, [link]);

  const faviconUrl = parsedUrl ? `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64` : null;
  const source = parsedUrl?.hostname.replace(/^www\./, "") ?? "link";
  const badgeLabel = isVideo ? "Video" : isPost ? "Post" : "Document";
  
  // Dynamic Metadata Extraction
  const meta = useMemo(() => {
    const metaMatch = description?.match(/Reading Time: (\d+) min \| Difficulty: (\w+)/);
    return {
      readingTime: metaMatch ? metaMatch[1] : "1",
      difficulty: metaMatch ? metaMatch[2] : "Beginner"
    };
  }, [description]);

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

  const getIcon = () => {
    if (faviconUrl) return <img src={faviconUrl} className="w-5 h-5 rounded-md object-contain" alt="icon" />;
    if (isVideo)    return <YouTubeIcon />;
    if (isPost)     return <TwitterIcon />;
    if (isDocument) return <DocumentIcon />;
    return <Shareicon />;
  };

  return (
    <div 
      onClick={onSelect}
      className={`group bg-white border border-gray-100 rounded-[24px] p-6 transition-all duration-500 flex flex-col h-full relative cursor-pointer ${
        isSelected 
          ? 'border-purple-200 ring-2 ring-purple-50 shadow-[0_20px_40px_-12px_rgba(124,58,237,0.08)]' 
          : 'hover:border-purple-200/50 hover:shadow-[0_15px_35px_-12px_rgba(0,0,0,0.04)] hover:-translate-y-1'
      }`}
    >
      
      {/* Header: Intelligence Row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 group-hover:scale-105 transition-transform duration-500">
            {getIcon()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{badgeLabel}</span>
            <span className="text-[12px] font-bold text-gray-700 truncate max-w-[140px] antialiased leading-none">{source}</span>
          </div>
        </div>
        
        {/* Pulse Indicator */}
        {description && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50/50 rounded-full border border-purple-100/30">
             <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse-semantic"></div>
             <span className="text-[9px] font-bold text-purple-500 uppercase tracking-tight">Synthesized</span>
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
            <h3 className="text-[15.5px] font-bold text-gray-800 leading-[1.4] group-hover:text-purple-700 transition-colors tracking-tight line-clamp-2 antialiased" title={title}>
              {title}
            </h3>
            {/* Quick Preview */}
            {description && (
              <p className="text-[12.5px] text-gray-400 font-medium line-clamp-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-1 group-hover:translate-y-0">
                {description.split('\n\n')[0]}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer: Metadata & Actions */}
      <div className="pt-5 mt-6 flex items-center justify-between border-t border-gray-50/50">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-1.5 text-gray-300 group-hover:text-gray-400 transition-colors">
              <svg className="w-3.5 h-3.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="text-[10px] font-bold tracking-tight uppercase">{meta.readingTime}m</span>
           </div>

           <div className="flex items-center">
            {aiStatus === "queued" || aiStatus === "processing" || aiStatus === "summarized" ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50/50 rounded-full border border-gray-100">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-pulse" />
                <span className="text-[9px] font-bold text-purple-400 uppercase tracking-widest">
                   Thinking
                </span>
              </div>
            ) : aiStatus === "completed" ? (
              <div className="text-[9px] font-bold text-purple-300 uppercase tracking-[0.15em]">
                 Verified Insight
              </div>
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
              className="p-2 text-gray-200 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
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
