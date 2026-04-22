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
  type: any;
  onDelete: () => void;
  onEdit: (newTitle: string) => void;
}

export function Card({ title, link, type, onDelete, onEdit }: CardProps) {
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

  const hostname = parsedUrl?.hostname.replace(/^www\./, "") ?? "";
  const pathname = parsedUrl?.pathname ?? "";
  const platformLabel = hostname || "saved link";
  const accentClasses = isVideo
    ? "from-rose-500 via-orange-400 to-amber-300"
    : isPost
      ? "from-sky-600 via-cyan-500 to-emerald-300"
      : "from-violet-600 via-indigo-500 to-blue-300";
  const badgeLabel = isVideo ? "VIDEO" : isPost ? "POST" : "DOC";
  const domainInitial = platformLabel.charAt(0).toUpperCase() || "L";

  const youtubeVideoId = useMemo(() => {
    if (!parsedUrl) {
      return null;
    }

    const host = parsedUrl.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return parsedUrl.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      return parsedUrl.searchParams.get("v");
    }

    return null;
  }, [parsedUrl]);

  const previewImageUrl = youtubeVideoId
    ? `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`
    : null;

  const previewCtaLabel = isVideo
    ? "Open Video"
    : isPost
      ? "Open Post"
      : "Open Document";

  const handleSave = () => {
    if (editedTitle.trim() !== "") {
      onEdit(editedTitle);
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

  const renderLinkPreview = () => (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-100 transition-all group-hover:border-purple-200 group-hover:shadow-sm">
        <div className={`relative aspect-video overflow-hidden ${previewImageUrl ? "bg-slate-900" : `bg-gradient-to-br ${accentClasses}`} p-4`}>
          {previewImageUrl ? (
            <>
              <img
                src={previewImageUrl}
                alt={`${title} thumbnail`}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/20" />
            </>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.28),transparent_42%)]" />
          )}

          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/18 text-lg font-semibold text-white backdrop-blur-sm">
                {domainInitial}
              </div>
              <span className="rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-white/90 backdrop-blur-sm">
                {badgeLabel}
              </span>
            </div>

            {isVideo && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/18 text-white backdrop-blur-md transition-transform duration-300 group-hover:scale-105">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="ml-1 h-8 w-8"
                  >
                    <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.86-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" />
                  </svg>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/75">
                {platformLabel}
              </p>
              <p className="mt-2 line-clamp-3 text-base font-semibold leading-tight text-white">
                {title}
              </p>
              {pathname && pathname !== "/" && (
                <p className="mt-2 line-clamp-1 text-xs text-white/70">
                  {pathname}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium text-gray-700 transition-colors group-hover:text-purple-700">
            {previewCtaLabel}
          </span>
          <span className="text-xs text-gray-400 transition-colors group-hover:text-purple-500">
            {platformLabel}
          </span>
        </div>
      </div>
    </a>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-4 hover:shadow-md transition-all duration-200 h-full group/card">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Icon Badge */}
          <div className="bg-purple-200 text-purple-600 p-2 rounded-full shrink-0">
            {getIcon()}
          </div>

          {/* Title / Edit Input */}
          <div className="flex-1 min-w-0 pt-1">
            {isEditing ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full rounded-2xl border border-violet-200 bg-violet-50/60 px-4 py-3 text-base font-medium text-slate-800 shadow-inner outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') handleCancel();
                  }}
                />
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSave}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700"
                  >
                    <CheckIcon /> <span>Save</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <CrossIcon /> <span>Cancel</span>
                  </button>
                </div>
              </div>
            ) : (
              <h3
                className="font-semibold text-gray-800 leading-tight line-clamp-2 break-words"
                title={title}
              >
                {title}
              </h3>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {!isEditing && (
          <div className="flex items-center gap-1 text-gray-400 shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity">
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-purple-600 transition-colors p-1.5 hover:bg-purple-50 rounded-md"
              title="Open Link"
            >
              <Shareicon />
            </a>
            <button
              onClick={() => {
                setEditedTitle(title);
                setIsEditing(true);
              }}
              className="hover:text-purple-600 transition-colors p-1.5 hover:bg-purple-50 rounded-md"
              title="Edit Title"
            >
              <EditIcon />
            </button>
            <button
              onClick={onDelete}
              className="hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-md"
              title="Delete Content"
            >
              <DeleteIcon />
            </button>
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="w-full">
        {/* VIDEO (youtube / video type) */}
        {isVideo && renderLinkPreview()}

        {/* POST (twitter / post type) */}
        {isPost && renderLinkPreview()}

        {/* DOCUMENT */}
        {isDocument && renderLinkPreview()}
      </div>
    </div>
  );
}
