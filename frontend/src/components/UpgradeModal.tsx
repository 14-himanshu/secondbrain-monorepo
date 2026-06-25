import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const navigate = useNavigate();

  if (!open) return null;

  const handleUpgrade = () => {
    onClose();
    navigate("/settings?tab=billing");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md p-6 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <DialogHeader className="flex flex-row items-start gap-3.5 space-y-0 text-left relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.2" stroke="currentColor" className="w-6 h-6 animate-pulse">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l8.982-11.761a.75.75 0 0 0-.616-1.218H14.07m-4.257 5.877L15 9.1l-8.982 11.761a.75.75 0 0 0 .616 1.218h3.19M15 9.1a2.25 2.25 0 0 1 2.248 2.354c-.059.665-.389 1.266-.88 1.685L15 15.34" />
            </svg>
          </div>
          <div>
            <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-white leading-snug">Upgrade to Pro</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase mt-0.5">AI Credits Exhausted</DialogDescription>
          </div>
        </DialogHeader>

        {/* Info Content */}
        <div className="space-y-4 relative z-10">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            You've hit your limit of 5 free AI-powered extractions. Upgrade to <strong>Pro</strong> to unlock infinite learning capabilities.
          </p>

          <div className="rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-4 space-y-3.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">PRO BENEFITS</h4>
            
            <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4 text-purple-600 mt-0.5 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span><strong>Unlimited</strong> AI Summaries & Extractions</span>
              </li>
              <li className="flex items-start gap-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4 text-purple-600 mt-0.5 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span><strong>Full Semantic Search</strong> over all contents</span>
              </li>
              <li className="flex items-start gap-2.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4 text-purple-600 mt-0.5 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span>Deep Extraction & High Precision Mode</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 relative z-10 pt-2">
          <button
            onClick={handleUpgrade}
            className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-[0.99] transition-all shadow-md shadow-purple-600/10 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            Upgrade Now
          </button>
          
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 active:scale-[0.99] transition-all focus:outline-none"
          >
            Maybe Later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
