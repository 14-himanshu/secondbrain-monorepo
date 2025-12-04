import { DeleteIcon } from "../icons/DeleteIcon";
import { Shareicon } from "../icons/ShareIcon";
import { YouTubeIcon } from "../icons/YoutubeIcon";
import { TwitterIcon } from "../icons/TwitterIcon";
import { DocumentIcon } from "../icons/DocumentIcon";
import { EditIcon } from "../icons/EditIcon";
import { CheckIcon } from "../icons/CheckIcon";
import { CrossIcon } from "../icons/CrossIcon";
import { useEffect, useState } from "react";

interface CardProps {
  title: string;
  link: string;
  type: any;
  onDelete: () => void;
  onEdit: (newTitle: string) => void;
}

export function Card({ title, link, type, onDelete, onEdit }: CardProps) {
  const normalizedType = type.toLowerCase();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);

  useEffect(() => {
    if (normalizedType === "twitter" && (window as any).twttr) {
      (window as any).twttr.widgets.load();
    }
  }, [normalizedType, link]);

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
    if (normalizedType === "youtube") return <YouTubeIcon />;
    if (normalizedType === "twitter") return <TwitterIcon />;
    if (normalizedType === "document") return <DocumentIcon />;
    return <Shareicon />;
  };

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
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') handleCancel();
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors flex items-center gap-1"
                  >
                    <CheckIcon /> Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors flex items-center gap-1"
                  >
                    <CrossIcon /> Cancel
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
        {/* YOUTUBE */}
        {normalizedType === "youtube" && (
          <div className="rounded-lg overflow-hidden border border-gray-100 bg-gray-100">
            <iframe
              className="w-full aspect-video"
              src={`https://www.youtube.com/embed/${link
                .split("/")
                .pop()
                ?.replace("watch?v=", "")}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            ></iframe>
          </div>
        )}

        {/* TWITTER */}
        {normalizedType === "twitter" && (
          <div className="rounded-lg overflow-hidden border border-gray-100">
            <blockquote className="twitter-tweet" data-dnt="true" data-theme="light">
              <a href={link.replace("x.com", "twitter.com")}></a>
            </blockquote>
          </div>
        )}

        {/* DOCUMENT */}
        {normalizedType === "document" && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <div className="flex flex-col items-center justify-center p-6 bg-gray-100 rounded-lg border border-gray-200 group-hover:border-purple-200 group-hover:bg-white transition-all">
              <div className="text-gray-400 group-hover:text-purple-600 transition-colors mb-3">
                <DocumentIcon />
              </div>
              <span className="text-sm font-medium text-gray-600 group-hover:text-purple-700 transition-colors underline decoration-transparent group-hover:decoration-purple-700 underline-offset-2">
                Open Document
              </span>
            </div>
          </a>
        )}
      </div>
    </div>
  );
}
