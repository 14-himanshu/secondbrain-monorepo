import { DeleteIcon } from "../icons/DeleteIcon";
import { Shareicon } from "../icons/ShareIcon";
import { YouTubeIcon } from "../icons/YoutubeIcon";
import { TwitterIcon } from "../icons/TwitterIcon";
import { DocumentIcon } from "../icons/DocumentIcon";
import { EditIcon } from "../icons/EditIcon";
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

export function Card({ title, link, type, status = null, aiStatus, aiMetadata, onDelete, onEdit, onSelect, onGenerateInsight, isSelected }: CardProps) {
  const normalizedType = type?.toLowerCase() ?? "";
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);

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

  const source = parsedUrl?.hostname.replace(/^www\./, "") ?? "link";
  const badgeLabel = isVideo ? "VIDEO" : isPost ? "POST" : "DOC";
  
  const typeStyles = useMemo(() => {
    if (isVideo) return "bg-amber-50 text-amber-600 border-amber-100";
    if (isPost) return "bg-blue-50 text-blue-600 border-blue-100";
    return "bg-slate-50 text-slate-500 border-slate-100";
  }, [isVideo, isPost]);

  const ctaLabel = isVideo ? "Watch Video" : isPost ? "Read Post" : "View Document";

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
    if (isVideo)    return <YouTubeIcon />;
    if (isPost)     return <TwitterIcon />;
    if (isDocument) return <DocumentIcon />;
    return <Shareicon />;
  };

  return (
    <div 
      onClick={onSelect}
      className={`group bg-white border rounded-xl px-4 py-4 transition-all duration-300 ease-out flex flex-col h-full relative overflow-hidden cursor-pointer ${
        isSelected 
          ? 'border-purple-100 ring-[3px] ring-purple-50/40 bg-purple-50/10' 
          : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
      }`}
    >
      
      {/* Header: Subtle Context */}
      <div className="flex items-center justify-between mb-3">
        <div className="w-7 h-7 bg-gray-50/80 rounded-lg flex items-center justify-center text-gray-400 group-hover:text-gray-500 transition-colors">
          <div className="scale-[0.7]">{getIcon()}</div>
        </div>
        <span className={`text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded uppercase border ${typeStyles}`}>
          {badgeLabel}
        </span>
      </div>

      {/* Content: Editorial Density */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="w-full rounded-lg border border-purple-200 bg-purple-50/20 px-3 py-1.5 text-[14px] font-bold text-gray-900 outline-none focus:ring-2 focus:ring-purple-100"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <div className="flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); handleSave(); }} className="text-[11px] font-bold text-purple-600 hover:text-purple-700 px-2 py-1 rounded-md bg-purple-50">Save</button>
              <button onClick={(e) => { e.stopPropagation(); handleCancel(); }} className="text-[11px] font-bold text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <h3 className="text-[14.5px] font-bold text-gray-900 leading-tight line-clamp-2 group-hover:text-purple-700 transition-colors tracking-tight" title={title}>
              {title}
            </h3>
            <p className="text-[11.5px] text-gray-400 font-bold uppercase tracking-tight opacity-70 flex items-center gap-1.5">
              {aiMetadata?.domain || aiMetadata?.source || source}
              {(aiStatus === "processing" || aiStatus === "queued") && (
                <span className="inline-block w-1 h-1 rounded-full bg-purple-400 animate-pulse" />
              )}
            </p>
          </div>
        )}
      </div>

      {/* Footer: Quiet Actions */}
      <div className="pt-3 mt-4 flex items-center justify-between border-t border-gray-50/80">
        <div className="flex items-center gap-1.5">
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="px-2.5 py-1.5 rounded-lg bg-gray-50/50 hover:bg-gray-100 text-[11px] font-bold text-gray-500 hover:text-gray-900 transition-all flex items-center gap-1.5 group/cta"
          >
            {ctaLabel}
            <svg className="w-2.5 h-2.5 opacity-40 group-hover/cta:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17l9.2-9.2M17 17V7H7" />
            </svg>
          </a>

          <div className="flex items-center">
            {aiStatus === "queued" || aiStatus === "processing" || aiStatus === "summarized" ? (
              <div className="flex items-center gap-1.5 px-2 py-1">
                <div className="w-1 h-1 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-[9px] font-bold text-purple-400 uppercase tracking-widest">
                   {aiStatus === "queued" ? "In Queue" : aiStatus === "summarized" ? "Almost Ready" : "Processing"}
                </span>
              </div>
            ) : aiStatus === "completed" || status === "completed" ? (
              <button 
                onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
                className="px-2 py-1 rounded-lg bg-purple-50/30 text-purple-600/80 text-[10px] font-bold hover:bg-purple-50 hover:text-purple-700 transition-all uppercase tracking-widest"
              >
                Insight
              </button>
            ) : aiStatus === "failed" || status === "failed" ? (
              <button 
                onClick={(e) => { e.stopPropagation(); onGenerateInsight?.(); }}
                className="px-2 py-1 text-red-400 text-[10px] font-bold hover:text-red-600 transition-all uppercase tracking-widest"
              >
                Retry
              </button>
            ) : (
              <button 
                onClick={(e) => { e.stopPropagation(); onGenerateInsight?.(); }}
                className="px-2 py-1 text-gray-400 text-[10px] font-bold hover:text-purple-600 transition-all uppercase tracking-widest opacity-0 group-hover:opacity-100"
              >
                Analyze
              </button>
            )}
          </div>
        </div>

        {!isEditing && (onDelete || onEdit) && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditedTitle(title);
                setIsEditing(true);
              }}
              className="p-1.5 text-gray-300 hover:text-gray-900 transition-colors"
            >
              <EditIcon />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
            >
              <DeleteIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
