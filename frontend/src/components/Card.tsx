import { DeleteIcon } from "../icons/DeleteIcon";
import { Shareicon } from "../icons/ShareIcon";
import { YouTubeIcon } from "../icons/YoutubeIcon";
import { TwitterIcon } from "../icons/TwitterIcon";
import { DocumentIcon } from "../icons/DocumentIcon";
import { useMemo, useState } from "react";
import type { IngestionStatus } from "@secondbrain/contracts";
import { Card as ShadcnCard } from "@/components/ui/card";

interface CardProps {
  title: string;
  link: string;
  type: "video" | "post" | "document" | string;
  status?: "pending" | "completed" | "failed" | null;
   aiStatus?: "unprocessed" | "queued" | "processing" | "summarized" | "completed" | "failed" | "scraping" | "analyzing" | "needs_manual_content";
  aiProgress?: number;
  aiMetadata?: {
    domain?: string;
    source?: string;
    contentType?: string;
    estimatedTopics?: string[];
    ingestionStatus?: IngestionStatus;
    ingestionReason?: string;
    acquisitionMethod?: string;
    accessRequirement?: "public" | "authenticated";
  };
  onDelete?: () => void;
  onEdit?: (newTitle: string) => void;
  onSelect?: () => void;
  onGenerateInsight?: () => void;
  isSelected?: boolean;
  description?: string;
  similarity?: number;
  readOnly?: boolean;
}

export function Card({
  title,
  link,
  type,
  aiStatus,
  aiProgress,
  aiMetadata,
  onDelete,
  onEdit,
  onSelect,
  onGenerateInsight,
  isSelected,
  description,
  similarity,
  readOnly,
}: CardProps) {
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

  const iconBgClass = isVideo 
    ? "bg-red-50 text-red-500 dark:bg-red-500/20 dark:text-red-400 border-red-100 dark:border-red-900/50" 
    : isPost 
      ? "bg-sky-50 text-sky-500 dark:bg-sky-500/20 dark:text-sky-400 border-sky-100 dark:border-sky-900/50" 
      : "bg-purple-50 text-purple-500 dark:bg-purple-500/20 dark:text-purple-400 border-purple-100 dark:border-purple-900/50";

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
  const isProcessing = Boolean(aiStatus && ["queued", "processing", "scraping", "analyzing"].includes(aiStatus));
  const ingestionStatus = aiMetadata?.ingestionStatus ?? (
    description && ["completed", "summarized"].includes(aiStatus || "") ? "full_extraction" : undefined
  );

  const ingestionBadge = useMemo(() => {
    switch (ingestionStatus) {
      case "full_extraction":
        return {
          label: "Full Extraction",
          pillClass: "bg-gray-50/50 dark:bg-gray-800/30 text-gray-500 dark:text-gray-400 border-gray-100/50 dark:border-gray-700/30",
          textClass: "text-gray-600 dark:text-gray-400",
        };
      case "partial_extraction":
        return {
          label: "Partial Extraction",
          pillClass: "bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-gray-800",
          textClass: "text-gray-600 dark:text-gray-500",
        };
      case "metadata_only":
        return {
          label: "Metadata Only",
          pillClass: "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-100 dark:border-gray-700",
          textClass: "text-gray-500 dark:text-gray-400",
        };
      case "authentication_required":
        return {
          label: "Authentication Required",
          pillClass: "bg-orange-50/50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400 border-orange-200/50 dark:border-orange-800/50",
          textClass: "text-orange-700 dark:text-orange-500",
        };
      case "unsupported":
        return {
          label: "Unsupported",
          pillClass: "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700",
          textClass: "text-gray-400 dark:text-gray-500",
        };
      case "failed":
        return {
          label: "Failed",
          pillClass: "bg-red-50/30 dark:bg-red-900/20 text-red-900 dark:text-red-400 border-red-200/30 dark:border-red-800/50",
          textClass: "text-red-800 dark:text-red-500",
        };
      default:
        return null;
    }
  }, [ingestionStatus]);
  

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
    <ShadcnCard 
      onClick={onSelect}
      className={`group p-4 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] flex flex-col h-full relative cursor-pointer overflow-hidden border border-purple-200/80 dark:border-purple-500/40 shadow-[0_0_15px_rgba(131,120,232,0.15)] dark:shadow-[0_0_15px_rgba(131,120,232,0.1)] ${
        isSelected 
          ? 'border-purple-400 dark:border-purple-400 ring-2 ring-purple-300/60 dark:ring-purple-500/60 shadow-[0_0_30px_rgba(131,120,232,0.4)] dark:shadow-[0_0_30px_rgba(131,120,232,0.3)] -translate-y-0.5' 
          : 'hover:border-purple-400 dark:hover:border-purple-400 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(131,120,232,0.4)] dark:hover:shadow-[0_0_30px_rgba(131,120,232,0.3)]'
      }`}
    >
      
      {/* Header: Intelligence Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-md flex items-center justify-center border transition-transform duration-150 ${iconBgClass}`}>
            {getIcon()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none mb-1">{badgeLabel}</span>
            <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[180px] antialiased leading-none">{source}</span>
          </div>
        </div>
        
        {/* Pulse & Link Actions */}
        <div className="flex items-center gap-2">
          {!readOnly && !isProcessing && ingestionBadge && (
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${ingestionBadge.pillClass}`}>
               <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
               <span className="text-[8.5px] font-bold uppercase tracking-tight">{ingestionBadge.label}</span>
            </div>
          )}
          {link && (
            <a 
              href={link} 
              target="_blank" 
              rel="noopener noreferrer" 
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-md transition-all"
              title="Open original resource"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow min-w-0 flex flex-col">
        {isEditing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="w-full rounded-xl border border-purple-100 dark:border-purple-900 bg-purple-50/20 dark:bg-purple-900/10 px-4 py-2.5 text-[14px] font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 transition-all"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <div className="flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); handleSave(); }} className="text-[10px] font-bold text-white px-3 py-1.5 rounded-lg bg-[#6f63d9] hover:bg-[#5b50b5] transition-all">Save</button>
              <button onClick={(e) => { e.stopPropagation(); handleCancel(); }} className="text-[10px] font-bold text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 px-3 py-1.5">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="text-[14px] font-semibold text-[#6f63d9] dark:text-[#8378e8] leading-[1.35] group-hover:text-[#5b50b5] dark:group-hover:text-[#9b92ed] transition-colors tracking-tight line-clamp-2 antialiased" title={title}>
              {title}
            </h3>
            {description ? (
              <p className="text-[13px] text-slate-700 dark:text-slate-300 font-medium line-clamp-3 leading-relaxed mt-1.5">
                {description.split('\n\n')[0]}
              </p>
            ) : (
              <div className="mt-2 flex flex-col gap-1.5">
                <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800/70 w-full" />
                <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800/70 w-4/5" />
                <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800/70 w-3/5" />
                {!readOnly && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium italic">No summary yet — generate one below</p>}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto w-full flex flex-col justify-end">
      {/* Neural Progress Bar: Sleek & Sophisticated */}
      {!readOnly && isProcessing && (
        <div className="mt-3 w-full h-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-full overflow-hidden shadow-inner">
          <div 
            className="h-full bg-purple-500 transition-all duration-500 ease-out relative overflow-hidden shadow-[0_0_8px_rgba(168,85,247,0.3)]"
            style={{ width: `${progressWidth}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] w-[200%] translate-x-[-100%]" />
          </div>
        </div>
      )}


      {/* Footer: Metadata & Actions */}
      {!readOnly && (
        <div className="pt-3 mt-3 flex items-center justify-between border-t border-gray-50 dark:border-gray-800 min-h-[60px]">
          {aiStatus === "unprocessed" ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerateInsight?.();
              }}
              className="flex-1 min-h-[44px] flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl font-medium text-[13px] bg-slate-50 hover:bg-purple-50 dark:bg-[#1c1c22] dark:hover:bg-purple-900/30 text-slate-700 dark:text-slate-300 hover:text-[#6f63d9] dark:hover:text-[#8378e8] border border-slate-200 dark:border-[#252530] hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-200 mr-2 group/btn"
            >
              {/* Sparkles / AI icon */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-purple-500 dark:text-purple-400 group-hover/btn:scale-110 transition-transform">
                <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" />
              </svg>
              Generate Summary
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                {isProcessing ? (
                  <div className={`px-2.5 py-1 rounded-full text-[9px] font-semibold uppercase tracking-widest flex items-center gap-2 border bg-purple-50/30 dark:bg-purple-900/20 border-purple-50 dark:border-purple-900/30 text-purple-600 dark:text-purple-400 animate-pulse`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    {aiStatus === "analyzing"
                      ? "Generating Summary"
                      : "Extracting Content"}
                  </div>
                ) : ingestionBadge ? (
                  similarity && ingestionStatus === "full_extraction" ? (
                    <div className={`text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-2 ${ingestionBadge.textClass}`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                      {Math.round(similarity * 100)}% Neural Match
                    </div>
                  ) : ingestionStatus === "full_extraction" ? (
                    <div className="text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1.5 text-[#6f63d9] dark:text-[#8378e8]">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Insights Ready
                    </div>
                  ) : (
                    <div className="text-[9px] font-bold uppercase tracking-[0.15em] flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      Saved to Library
                    </div>
                  )
                ) : aiStatus === "failed" ? (
                  <div className="text-[9px] font-bold text-red-500 uppercase tracking-[0.15em]">Synthesis Failed</div>
                ) : null}
              </div>
            </div>
          )}

          {!isEditing && (
            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-[92px] shrink-0">
              {onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-all"
                  title="Edit Title"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                  title="Remove"
                >
                  <DeleteIcon />
                </button>
              )}
            </div>
          )}
        </div>
      )}
      </div>
    </ShadcnCard>
  );
}
