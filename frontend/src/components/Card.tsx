import { DeleteIcon } from "../icons/DeleteIcon";
import { Shareicon } from "../icons/ShareIcon";
import { YouTubeIcon } from "../icons/YoutubeIcon";
import { TwitterIcon } from "../icons/TwitterIcon";
import { DocumentIcon } from "../icons/DocumentIcon";
import { EditIcon } from "../icons/EditIcon";
import { CheckIcon } from "../icons/CheckIcon";
import { CrossIcon } from "../icons/CrossIcon";
import { useMemo, useState } from "react";

interface CardProps {
  title: string;
  link: string;
  type: "video" | "post" | "document" | string;
  onDelete?: () => void;
  onEdit?: (newTitle: string) => void;
  description?: string; // Support optional description
}

export function Card({ title, link, type, onDelete, onEdit, description }: CardProps) {
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
  
  // Dynamic styling based on type
  const typeStyles = useMemo(() => {
    if (isVideo) return "bg-amber-100 text-amber-700";
    if (isPost) return "bg-blue-100 text-blue-600";
    return "bg-slate-100 text-slate-600";
  }, [isVideo, isPost]);

  const ctaLabel = isVideo ? "Open Video" : isPost ? "Open Post" : "Open Document";

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
    <div className="group cursor-pointer bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-in-out flex flex-col h-full">
      {/* Header: Icon and Badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 transition-colors group-hover:bg-gray-200">
          {getIcon()}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-md font-semibold tracking-tight ${typeStyles}`}>
          {badgeLabel}
        </span>
      </div>

      {/* Content Section */}
      <div className="flex-1 space-y-1.5 min-w-0">
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="w-full rounded-md border border-purple-200 bg-purple-50/30 px-3 py-1.5 text-sm font-medium text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <div className="flex gap-2">
              <button onClick={handleSave} className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"><CheckIcon /> Save</button>
              <button onClick={handleCancel} className="text-xs font-semibold text-gray-500 hover:text-gray-700 flex items-center gap-1"><CrossIcon /> Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-base font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-purple-700 transition-colors" title={title}>
              {title}
            </h3>
            <p className="text-sm text-gray-500 truncate">
              {source}
            </p>
            {description && (
              <p className="text-sm text-gray-400 line-clamp-1 mt-1">
                {description}
              </p>
            )}
          </>
        )}
      </div>

      {/* Action Section Area */}
      <div className="border-t border-gray-100 pt-3 mt-5 flex items-center justify-between">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-md bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors flex items-center gap-2 group/cta"
        >
          {ctaLabel}
          <svg className="w-3.5 h-3.5 text-gray-400 group-hover/cta:text-purple-600 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17l9.2-9.2M17 17V7H7" />
          </svg>
        </a>

        {!isEditing && (onDelete || onEdit) && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={(e) => {
                e.preventDefault();
                setEditedTitle(title);
                setIsEditing(true);
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="Edit"
            >
              <EditIcon />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                onDelete?.();
              }}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
              title="Delete"
            >
              <DeleteIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
