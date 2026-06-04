import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export function PaymentSuccess() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
      {/* Decorative Blur Backdrops */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 dark:bg-purple-600/10 rounded-full blur-[100px] animate-pulse-semantic" style={{ animationDuration: '6s' }}></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-[100px] animate-pulse-semantic" style={{ animationDuration: '8s', animationDelay: '2s' }}></div>

      <div 
        className={`max-w-md w-full bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.03)] dark:shadow-none transition-all duration-700 transform z-10 ${
          mounted ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95"
        }`}
      >
        {/* Animated Checkmark Wrapper */}
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center border border-purple-100/50 dark:border-purple-800/30 shadow-[0_8px_30px_rgb(147,51,234,0.1)] mb-6 animate-bounce">
            <svg 
              className="w-10 h-10 text-purple-600 dark:text-purple-400 stroke-current animate-in fade-in zoom-in-50 duration-500 delay-300"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth="3"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-[0.25em] mb-2">Upgrade Complete</span>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-3">
            Payment Successful!
          </h1>
          <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm mb-8">
            You are now a <span className="font-extrabold text-purple-600 dark:text-purple-400">Pro user</span>. All premium brain capabilities have been unlocked on your account.
          </p>
        </div>

        {/* Unlocked Capabilities Box */}
        <div className="bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 mb-8 space-y-4">
          <h3 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
            Capabilities Unlocked
          </h3>
          
          <div className="flex gap-3">
            <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 text-[10px] font-bold">✓</div>
            <div>
              <h4 className="text-[12px] font-bold text-gray-800 dark:text-gray-250">Unlimited Neural Extractions</h4>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">Process and structure bookmarks without limits.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 text-[10px] font-bold">✓</div>
            <div>
              <h4 className="text-[12px] font-bold text-gray-800 dark:text-gray-250">Full-Text Semantic RAG Chat</h4>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">Unlock advanced intelligence and cross-notes querying.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 text-[10px] font-bold">✓</div>
            <div>
              <h4 className="text-[12px] font-bold text-gray-800 dark:text-gray-250">Priority Automatic Ingestion</h4>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">Queue links for background content processing.</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => navigate("/")}
            className="w-full py-4 bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white rounded-2xl text-[12px] font-bold uppercase tracking-wider transition-all shadow-lg shadow-purple-200 dark:shadow-none flex items-center justify-center gap-2"
          >
            <span>Return to Workspace</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
          
          <button
            onClick={() => navigate("/settings?tab=billing")}
            className="w-full py-3.5 bg-gray-100 hover:bg-gray-250 active:scale-[0.99] dark:bg-gray-850 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all"
          >
            Manage Subscription & Billing
          </button>
        </div>
      </div>
    </div>
  );
}
