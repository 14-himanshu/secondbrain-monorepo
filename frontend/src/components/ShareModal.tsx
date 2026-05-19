import { useState } from "react";
import { CrossIcon } from "../icons/CrossIcon";

import { CheckIcon } from "../icons/CheckIcon";
import type { ShareType } from "@secondbrain/contracts";
import { updateShare } from "../services/share.api";
import { isApiError } from "../lib/apiClient";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  onStatusChange: () => void;
  shareStatus: { shareType: ShareType; shareId: string | null };
}

export function ShareModal({ open, onClose, onStatusChange, shareStatus }: ShareModalProps) {
  const [shareType, setShareType] = useState<ShareType>(shareStatus.shareType);
  const [shareId, setShareId] = useState<string | null>(shareStatus.shareId);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function updateShareSettings(type: ShareType, regenerate = false) {
    setLoading(true);
    try {
      const response = await updateShare(type, regenerate);
      setShareType(response.shareType);
      setShareId(response.shareId);
      onStatusChange();
    } catch (e) {
      if (isApiError(e)) {
        alert(e.message || "Failed to update sharing settings");
        return;
      }
      alert("Failed to update sharing settings");
    } finally {
      setLoading(false);
    }
  }

  const shareUrl = shareId ? `${window.location.origin}/share/${shareId}` : "";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Share Brain</h3>
              <p className="text-sm text-gray-500">Control who can view your brain</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <CrossIcon />
          </button>
        </div>

        {/* Sharing Modes */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700">Access Mode</label>
          <div className="grid grid-cols-1 gap-2">
            {[
              { id: 'private', label: 'Private', desc: 'Only you can see this brain', icon: <LockIcon /> },
              { id: 'link', label: 'Anyone with Link', desc: 'Anyone with the link can view', icon: <LinkIcon /> },
              { id: 'public', label: 'Public', desc: 'Visible to everyone on your profile', icon: <GlobeIcon /> },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => updateShareSettings(mode.id as ShareType)}
                disabled={loading}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                  shareType === mode.id 
                    ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-600' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className={`mt-0.5 ${shareType === mode.id ? 'text-purple-600' : 'text-gray-400'}`}>
                  {mode.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold ${shareType === mode.id ? 'text-purple-900' : 'text-gray-900'}`}>{mode.label}</div>
                  <div className="text-xs text-gray-500">{mode.desc}</div>
                </div>
                {shareType === mode.id && (
                  <div className="text-purple-600">
                    <CheckIcon />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Link Management (Visible if not Private) */}
        {shareType !== 'private' && shareId && (
          <div className="space-y-3 rounded-xl bg-gray-50 p-4 border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Shareable Link</label>
              <button 
                onClick={() => updateShareSettings(shareType, true)}
                className="text-[10px] font-bold text-purple-600 hover:text-purple-700 uppercase tracking-tight flex items-center gap-1"
                disabled={loading}
              >
                <RefreshIcon /> Regenerate
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 truncate">
                {shareUrl}
              </div>
              <button
                onClick={copyToClipboard}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-all ${
                  copied ? 'bg-emerald-500 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Permissions & Scope */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Permissions</label>
            <select className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-600/20" disabled>
              <option>View only</option>
              <option disabled>Edit (Coming soon)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Scope</label>
            <select className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-600/20">
              <option>Entire Brain</option>
              <option disabled>Selected Items</option>
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        {shareType !== 'private' && (
          <div className="pt-2">
            <button
              onClick={() => updateShareSettings('private')}
              className="w-full rounded-xl border border-red-100 bg-red-50 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 transition-colors"
              disabled={loading}
            >
              Stop Sharing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Internal Icons
function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9s2.015-9 4.5-9m0 0a9.004 9.004 0 0 1 8.716 6.747M12 3a9.004 9.004 0 0 0-8.716 6.747" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-3 h-3">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}
