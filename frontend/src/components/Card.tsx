import { DeleteIcon } from "../icons/DeleteIcon";
import { Shareicon } from "../icons/ShareIcon";
import { YouTubeIcon } from "../icons/YoutubeIcon";
import { TwitterIcon } from "../icons/TwitterIcon";
import { DocumentIcon } from "../icons/DocumentIcon";
import { useMemo, useState, useEffect } from "react";

interface CardProps {
  title: string;
  link: string;
  type: "video" | "post" | "document" | string;
  status?: "pending" | "completed" | "failed" | null;
  aiStatus?: "queued" | "processing" | "summarized" | "completed" | "failed" | "scraping" | "analyzing";
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
  const [creep, setCreep] = useState(0);

  useEffect(() => {
    let interval: any;
    if (aiStatus && ["thinking", "scraping", "analyzing", "queued", "processing"].includes(aiStatus)) {
      setCreep(0);
      interval = setInterval(() => {
        setCreep(prev => Math.min(prev + 0.5, 10)); // Creep forward up to 10% extra
      }, 800);
    } else {
      setCreep(0);
    }
    return () => clearInterval(interval);
  }, [aiStatus]);

  const progressWidth = useMemo(() => {
    if (!aiStatus) return 0;
    // Use true backend progress if available, otherwise fallback to stage-based estimation
    const base = aiProgress && aiProgress > 0 ? aiProgress : 
                 (aiStatus === "queued" || aiStatus === "thinking") ? 20 : 
                 aiStatus === "scraping" ? 40 : 
                 aiStatus === "analyzing" ? 75 : 95;
    return Math.min(base + creep, 98);
  }, [aiStatus, aiProgress, creep]);

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

  const faviconUrl = parsedUrl ? `https://icons.duckduckgo.com/ip3/${parsedUrl.hostname}.ico` : null;
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

      {/* Neural Progress Bar: Sleek & Sophisticated */}
      {(aiStatus && ["thinking", "scraping", "analyzing", "queued", "processing"].includes(aiStatus)) && (
        <div className="absolute bottom-[68px] left-6 right-6 h-[2px] bg-purple-50/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-400 via-purple-600 to-indigo-500 shadow-[0_0_12px_rgba(168,85,247,0.4)] transition-all duration-1000 ease-linear animate-shimmer-semantic"
            style={{ 
              width: `${progressWidth}%`,
              backgroundSize: '200% 100%'
            }}
          />
        </div>
      )}

      {/* Footer: Metadata & Actions */}
      <div className="pt-5 mt-6 flex items-center justify-between border-t border-gray-50/50">
        <div className="flex items-center gap-4">
           <div className="flex items-center">
            {aiStatus && ["queued", "processing", "summarized", "thinking", "scraping", "analyzing"].includes(aiStatus) ? (
              <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border bg-gray-50/50 border-gray-100 text-purple-400 animate-pulse`}>
                <div className="w-1.5 h-1.5 rounded-full bg-purple-300" />
                {aiStatus === "thinking" || aiStatus === "queued" ? "Thinking" : 
                 aiStatus === "scraping" ? "Reading Page" :
                 aiStatus === "analyzing" ? "Analyzing" : "Processing"}
              </div>
            ) : (aiStatus === "completed" || aiStatus === "summarized") ? (
              <div className="text-[9px] font-bold text-purple-300 uppercase tracking-[0.15em] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                {/* @ts-ignore */}
                {similarity ? `${Math.round(similarity * 100)}% Neural Match` : "Verified Insight"}
              </div>
            ) : aiStatus === "failed" ? (
              <div className="text-[9px] font-bold text-red-300 uppercase tracking-[0.15em]">Synthesis Failed</div>
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
