import { useState } from "react";


import { CheckIcon } from "../icons/CheckIcon";
import type { ShareType } from "@secondbrain/contracts";
import { updateShare } from "../services/share.api";
import { isApiError } from "../lib/apiClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  onStatusChange: () => void;
  shareStatus: { shareType: ShareType; shareId: string | null };
}

export function ShareModal({ open, onClose, onStatusChange, shareStatus }: ShareModalProps) {
  const [shareType, setShareType] = useState<ShareType>(shareStatus.shareType === 'public' ? 'link' : shareStatus.shareType);
  const [shareId, setShareId] = useState<string | null>(shareStatus.shareId);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateShareSettings(type: ShareType, regenerate = false) {
    if (type === shareType && !regenerate) return;

    // Optimistic UI update to remove perceived lag
    const previousType = shareType;
    const previousId = shareId;
    
    setShareType(type);
    setLoading(true);
    setError(null);
    
    try {
      const response = await updateShare(type, regenerate);
      setShareType(response.shareType);
      setShareId(response.shareId);
      onStatusChange();
    } catch (e) {
      // Revert on error
      setShareType(previousType);
      setShareId(previousId);
      
      if (isApiError(e)) {
        setError(e.message || "Failed to update sharing settings");
        return;
      }
      setError("Failed to update sharing settings");
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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[420px] p-0 border border-gray-200/50 dark:border-gray-800/50 bg-white/95 dark:bg-[#0d0d0f]/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden flex flex-col gap-0 outline-none">
        <div className="p-6 flex flex-col gap-6">
          {/* Header */}
          <DialogHeader className="flex flex-row items-center gap-4 text-left p-0 m-0 border-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-100/50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 ring-1 ring-purple-100 dark:ring-purple-900/50 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
              </svg>
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Share Brain</DialogTitle>
              <DialogDescription className="text-sm font-medium text-slate-700 dark:text-slate-400 mt-1">Control who can view your knowledge</DialogDescription>
            </div>
          </DialogHeader>

          {/* Error banner */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 flex items-start gap-2.5 animate-in fade-in zoom-in-95 duration-200" role="alert">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 text-red-500 mt-0.5">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              <p className="text-red-500 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Sharing Modes */}
          <div className="space-y-3">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 pl-1">Access Level</label>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'private', label: 'Private', desc: 'Only you can see this brain', icon: <LockIcon /> },
                { id: 'link', label: 'Anyone with Link', desc: 'Anyone with the link can view', icon: <LinkIcon /> },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => updateShareSettings(mode.id as ShareType)}
                  disabled={loading}
                  className={`relative flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-300 overflow-hidden ${
                    shareType === mode.id 
                      ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20 ring-2 ring-purple-100 dark:ring-purple-900/50 shadow-md' 
                      : 'border-gray-200/60 dark:border-gray-800 bg-white dark:bg-[#15151a] hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm'
                  }`}
                >
                  {shareType === mode.id && (
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent dark:from-purple-500/10 pointer-events-none" />
                  )}
                  <div className={`relative flex items-center justify-center shrink-0 w-12 h-12 rounded-full transition-colors duration-300 ${shareType === mode.id ? 'bg-white dark:bg-[#0d0d0f] text-purple-600 dark:text-purple-400 shadow-sm ring-1 ring-purple-100 dark:ring-purple-900' : 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500'}`}>
                    {mode.icon}
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <div className={`text-[15px] font-bold tracking-tight ${shareType === mode.id ? 'text-[#6f63d9] dark:text-[#8378e8]' : 'text-slate-900 dark:text-slate-200'}`}>{mode.label}</div>
                    <div className={`text-[13px] font-medium mt-0.5 truncate ${shareType === mode.id ? 'text-[#5b50b5] dark:text-[#9b92ed]' : 'text-slate-500 dark:text-slate-400'}`}>{mode.desc}</div>
                  </div>
                  <div className={`shrink-0 transition-all duration-300 ${shareType === mode.id ? 'opacity-100 scale-100 text-purple-600 dark:text-purple-400' : 'opacity-0 scale-50 text-transparent'}`}>
                    <div className="bg-white dark:bg-[#0d0d0f] rounded-full p-1 shadow-sm ring-1 ring-purple-100 dark:ring-purple-900/50">
                      <CheckIcon />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Link Management */}
          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${shareType !== 'private' && shareId ? 'opacity-100 max-h-[300px]' : 'opacity-0 max-h-0'}`}>
            <div className="space-y-4 rounded-2xl bg-[#f8f8fb] dark:bg-[#15151a] p-5 border border-purple-100/50 dark:border-purple-900/20">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Shareable Link</label>
                <button 
                  onClick={() => updateShareSettings(shareType, true)}
                  className="text-[10px] font-bold text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 uppercase tracking-widest flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/30 px-3 py-1.5 rounded-lg transition-colors active:scale-95"
                  disabled={loading}
                >
                  <RefreshIcon /> Reset Link
                </button>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0d0d0f] px-4 py-3 text-[14px] font-medium text-slate-900 dark:text-slate-300 shadow-sm truncate select-all">
                  {shareUrl}
                </div>
                <button
                  onClick={copyToClipboard}
                  className={`flex items-center justify-center gap-2 rounded-xl shrink-0 px-6 py-3 text-[14px] font-bold transition-all duration-200 shadow-sm active:scale-95 text-white ${
                    copied ? 'bg-emerald-500 hover:bg-emerald-600 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#15151a] ring-emerald-500/50' : 'bg-[#6f63d9] hover:bg-[#5b50b5]'
                  }`}
                >
                  {copied
                    ? <><div className="scale-90"><CheckIcon /></div><span>Copied!</span></>
                    : <><div className="scale-90"><CopyIcon /></div><span>Copy Link</span></>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-4 border-t border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-[#0d0d0f]">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 pl-1">Permissions</label>
              <div className="relative">
                <select className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15151a] px-4 py-2.5 text-[13px] font-bold text-slate-900 dark:text-slate-300 focus:outline-none appearance-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm">
                  <option>View only</option>
                  <option disabled>Edit (Coming soon)</option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
            <div className="space-y-2.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 pl-1">Scope</label>
              <div className="relative">
                <select className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#15151a] px-4 py-2.5 text-[13px] font-bold text-slate-900 dark:text-slate-300 focus:outline-none appearance-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm">
                  <option>Entire Brain</option>
                  <option disabled>Selected Items</option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
          </div>
          
          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${shareType !== 'private' ? 'opacity-100 max-h-[100px] mt-6' : 'opacity-0 max-h-0 mt-0'}`}>
            <button
              onClick={() => updateShareSettings('private')}
              className="w-full rounded-xl border border-red-200/60 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 py-3 text-[14px] font-bold text-red-500 dark:text-red-400 hover:bg-red-100 hover:border-red-300 dark:hover:bg-red-900/30 transition-all shadow-sm active:scale-[0.98]"
              disabled={loading}
            >
              Stop Sharing
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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


function CopyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

