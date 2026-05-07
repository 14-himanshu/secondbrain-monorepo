import { useEffect, useState, useRef } from "react";
import axios from "axios";
import type { Content } from "../hooks/useContent";
import { BACKEND_URL } from "../config";

interface AIInsightsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  contentCount: number;
  selectedContent?: Content;
  onClearSelection?: () => void;
  onRetry?: (id: string) => void;
  isSlowAnalysis?: boolean;
}

export function AIInsightsPanel({
  isOpen,
  onClose,
  contentCount,
  selectedContent,
  onClearSelection,
  onRetry,
  isSlowAnalysis
}: AIInsightsPanelProps) {
  const [activeTab, setActiveTab] = useState<"brain" | "note" | "chat">("brain");
  const [chatQuery, setChatQuery] = useState("");
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string, sources?: any[]}[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const aiStatus = selectedContent?.aiStatus;
  const isFailed = aiStatus === "failed";

  const [brainIntelligence, setBrainIntelligence] = useState<{
    summary: string;
    insights: {
      category: string;
      title: string;
      description: string;
      confidence: "Strong" | "Moderate" | "Emerging";
      sources: { title: string, id: string, link: string }[];
    }[];
  } | null>(null);
  const [isIntelligenceLoading, setIsIntelligenceLoading] = useState(false);
  const [intelligenceError, setIntelligenceError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (selectedContent) {
      setActiveTab("note");
    } else if (activeTab !== "chat") {
      setActiveTab("brain");
    }
  }, [selectedContent]);

  useEffect(() => {
    if (activeTab === "brain" && !brainIntelligence && isOpen) {
      fetchIntelligence();
    }
  }, [activeTab, isOpen]);

  const fetchIntelligence = async () => {
    // Reset states
    setIsIntelligenceLoading(true);
    setIntelligenceError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/ai/insights`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Neural engine responded with status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setBrainIntelligence(data.data);
      } else {
        throw new Error(data.message || "Failed to synthesize brain patterns.");
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setIntelligenceError("Intelligence synthesis timed out. Our neural engine is heavily loaded.");
      } else {
        console.error("Failed to fetch intelligence", err);
        setIntelligenceError(err.message || "Unable to generate insights right now.");
      }
    } finally {
      setIsIntelligenceLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, retryQuery?: string) => {
    if (e) e.preventDefault();
    
    const userQuery = retryQuery || chatQuery;
    if (!userQuery.trim() || isThinking) return;

    console.log("[CHAT_REQUEST]", userQuery);
    
    // Clear previous error
    setChatError(null);
    if (!retryQuery) setChatQuery("");
    
    // Construct history for RAG (last 6 messages)
    const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
    
    if (!retryQuery) {
      setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    }
    
    setIsThinking(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/v1/ai/chat`, {
        query: userQuery,
        history
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        timeout: 15000 // 15s timeout as requested
      });

      console.log("[CHAT_RESPONSE]", response.data);

      if (response.data.success) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response.data.answer, 
          sources: response.data.sources 
        }]);
      } else {
        throw new Error(response.data.error || "Brain synthesis failed.");
      }
    } catch (error: any) {
      console.log("[CHAT_ERROR]", error);
      const errorMsg = error.code === 'ECONNABORTED' 
        ? "Brain synthesis timed out. Our neural engine is heavily loaded."
        : (error.response?.data?.error || "Brain synthesis failed. Please try again.");
      
      setChatError(errorMsg);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div
      className={`fixed right-0 top-0 h-screen w-80 bg-white border-l border-gray-100 transition-all duration-300 ease-in-out z-40 flex flex-col shadow-2xl ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header: Quiet & Contextual */}
      <div className="p-4 px-5 border-b border-gray-50 flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveTab("brain")}
              className={`text-[13px] font-bold tracking-tight transition-colors ${activeTab === 'brain' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Brain
            </button>
            <span className="text-gray-200 text-[10px]">•</span>
            <button 
              onClick={() => setActiveTab("chat")}
              className={`text-[13px] font-bold tracking-tight transition-colors ${activeTab === 'chat' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Chat
            </button>
            {activeTab === 'chat' && (
              <>
                <span className="text-gray-200 text-[10px]">•</span>
                <button 
                  onClick={() => setShowDebug(!showDebug)}
                  className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${showDebug ? 'text-purple-600' : 'text-gray-300 hover:text-gray-500'}`}
                >
                  Debug
                </button>
              </>
            )}
            {selectedContent && (
              <>
                <span className="text-gray-200 text-[10px]">•</span>
                <button 
                  onClick={() => setActiveTab("note")}
                  className={`text-[13px] font-bold tracking-tight transition-colors ${activeTab === 'note' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Note
                </button>
              </>
            )}
          </div>
          <span className="text-[9px] font-bold text-purple-400 uppercase tracking-[0.15em] mt-0.5">
            {activeTab === "brain" ? "Neural Overview" : activeTab === "chat" ? "Contextual Chat" : "Note Synthesis"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-300 hover:text-gray-900 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        {activeTab === "brain" ? (
          /* Global Brain Intelligence - Human-Designed Editorial View */
          <div className="flex flex-col gap-8 p-6 animate-in fade-in slide-in-from-bottom-2 duration-1000 custom-scrollbar overflow-y-auto max-h-full">
             {/* Subtle Human Header */}
             <div className="space-y-1 px-1">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em]">Neural Overview</span>
                <h2 className="text-[18px] font-semibold text-slate-900 tracking-tight leading-tight">Intellectual Roadmap</h2>
             </div>

             {isIntelligenceLoading ? (
               <div className="flex flex-col gap-8">
                  {/* Staged Skeleton Loaders */}
                  <div className="px-1 space-y-3">
                     <div className="h-3 bg-slate-100 rounded-full w-full animate-pulse"></div>
                     <div className="h-3 bg-slate-50 rounded-full w-5/6 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <div className="flex flex-col gap-6">
                    <div className="h-40 bg-slate-50/50 border border-slate-100 rounded-2xl animate-pulse"></div>
                    <div className="h-40 bg-slate-50/50 border border-slate-100 rounded-2xl animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
               </div>
             ) : intelligenceError ? (
               /* ERROR STATE: Clear Recovery Path */
               <div className="py-12 flex flex-col items-center justify-center text-center px-4 animate-in fade-in zoom-in-95 duration-500">
                  <div className="w-14 h-14 bg-red-50 text-red-400 rounded-2xl flex items-center justify-center mb-6 border border-red-100/50">
                     <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                     </svg>
                  </div>
                  <h3 className="text-[15px] font-semibold text-slate-900 mb-2 tracking-tight">Synthesis Interrupted</h3>
                  <p className="text-[12px] text-slate-400 font-medium leading-relaxed max-w-[220px] mb-8">
                    {intelligenceError}
                  </p>
                  <button 
                    onClick={fetchIntelligence}
                    className="px-6 py-2.5 bg-slate-900 text-white text-[11px] font-bold rounded-xl hover:bg-purple-600 transition-all shadow-lg shadow-slate-200"
                  >
                    Retry Synthesis
                  </button>
               </div>
             ) : (brainIntelligence && brainIntelligence.insights.length > 0) ? (
               <div className="flex flex-col gap-10">
                 {/* Editorial Summary Statement */}
                 <div className="px-1">
                    <p className="text-[13px] text-slate-500 leading-relaxed font-medium antialiased">
                      {brainIntelligence.summary}
                    </p>
                 </div>

                 {/* Insights Feed */}
                 <div className="flex flex-col gap-6">
                   {brainIntelligence.insights.map((insight, i) => (
                     <div key={i} className="group flex flex-col gap-5 p-5 bg-white border border-slate-100 rounded-2xl hover:border-purple-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-500">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              <div className={`w-1 h-1 rounded-full ${
                                insight.category === 'Knowledge Gap' ? 'bg-amber-400' :
                                insight.category === 'Learning Trend' ? 'bg-purple-400' :
                                'bg-blue-400'
                              }`}></div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                {insight.category}
                              </span>
                           </div>
                           <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-full border border-slate-100">
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Confidence</span>
                              <span className={`text-[8px] font-bold ${
                                insight.confidence === 'Strong' ? 'text-emerald-600' :
                                insight.confidence === 'Moderate' ? 'text-amber-600' :
                                'text-purple-600'
                              }`}>
                                {insight.confidence}
                              </span>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <h3 className="text-[15px] font-semibold text-slate-900 group-hover:text-purple-600 transition-colors tracking-tight">{insight.title}</h3>
                           <p className="text-[12px] text-slate-500 leading-relaxed font-medium antialiased">
                             {insight.description}
                           </p>
                        </div>

                        {insight.sources && insight.sources.length > 0 && (
                          <div className="pt-4 border-t border-slate-50 flex flex-col gap-3">
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Generated from:</span>
                             <div className="flex flex-wrap gap-2">
                                {insight.sources.map((s, idx) => (
                                  <a 
                                    key={idx} 
                                    href={s.link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50/50 hover:bg-white border border-slate-100/50 hover:border-purple-200 rounded-xl text-[10px] font-medium text-slate-600 hover:text-purple-600 transition-all group/source"
                                  >
                                    <svg className="w-2.5 h-2.5 opacity-30 group-hover/source:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    <span className="truncate max-w-[150px]">{s.title}</span>
                                  </a>
                                ))}
                             </div>
                          </div>
                        )}
                     </div>
                   ))}
                 </div>

                 {/* Minimalist Capacity Card */}
                 <div className="mx-1 p-5 bg-slate-900 rounded-2xl text-white shadow-2xl shadow-slate-200/50 relative overflow-hidden group">
                    <div className="relative z-10 flex items-center justify-between">
                       <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Memory Depth</span>
                          <span className="text-2xl font-semibold tracking-tight">{contentCount} <span className="text-sm font-medium text-slate-500">Items</span></span>
                       </div>
                       <div className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center backdrop-blur-md group-hover:bg-white/10 transition-all duration-500">
                          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                       </div>
                    </div>
                 </div>
               </div>
             ) : (
               /* EMPTY STATE: Knowledge Seedling */
               <div className="py-24 flex flex-col items-center justify-center text-center px-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                  <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-200 mb-6 shadow-sm">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                     </svg>
                  </div>
                  <h3 className="text-[15px] font-semibold text-slate-900 mb-2 tracking-tight">Knowledge Seedling</h3>
                  <p className="text-[12px] text-slate-400 font-medium leading-relaxed max-w-[200px] mx-auto">
                    Your brain is starting to take shape. Add 3 or more knowledge items to unlock deep behavioral trends and semantic shifts.
                  </p>
                  <button 
                    onClick={fetchIntelligence}
                    className="mt-8 text-[10px] font-bold text-purple-400 uppercase tracking-widest hover:text-purple-600 transition-colors"
                  >
                    Check again
                  </button>
               </div>
             )}
          </div>
        ) : activeTab === "chat" ? (
          /* CONTEXTUAL CHAT INTERFACE */
          <div className="flex-1 flex flex-col min-h-0 bg-gray-50/30">
            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center px-6">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4 rotate-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h3 className="text-[13px] font-bold text-gray-900 mb-1">Chat with your Brain</h3>
                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                    Ask questions about your saved notes, videos, and links. I'll search your brain for answers.
                  </p>
                </div>
              )}
                       {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  {msg.role === 'user' ? (
                    <div className="flex flex-col items-end gap-1.5">
                       <span className="text-[8px] font-bold text-purple-400 uppercase tracking-widest mr-1">Your Query</span>
                       <div className="max-w-[95%] p-3.5 bg-purple-600 text-white rounded-2xl rounded-tr-none text-[12.5px] font-medium leading-relaxed shadow-lg shadow-purple-100/50">
                         {msg.content}
                       </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-3 w-full">
                       <div className="flex items-center gap-1.5 ml-1">
                          <div className="w-1 h-1 rounded-full bg-purple-400"></div>
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Brain Synthesis</span>
                       </div>
                       <div className="max-w-[95%] p-4 bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-none text-[12.5px] font-medium leading-relaxed shadow-sm whitespace-pre-wrap">
                         {msg.content}
                       </div>
                       
                       {msg.sources && msg.sources.length > 0 && (
                        <div className="flex flex-col gap-3 w-full px-1">
                           <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Retrieved Memories</span>
                              <span className="text-[8px] font-bold text-purple-400/60 uppercase">{msg.sources.length} sources grounded</span>
                           </div>
                           <div className="grid grid-cols-1 gap-2">
                              {msg.sources.map((s, idx) => (
                                <a 
                                  key={idx} 
                                  href={s.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="group flex items-center gap-3 p-2.5 bg-gray-50/50 border border-gray-100/50 rounded-xl hover:border-purple-200 hover:bg-white transition-all duration-300 shadow-sm"
                                >
                                  <div className="w-8 h-8 flex-shrink-0 bg-white rounded-lg border border-gray-100 flex items-center justify-center text-purple-500 font-bold text-[10px] shadow-sm group-hover:scale-105 transition-transform">
                                     {s.type === 'video' ? '▶' : s.type === 'document' ? '📄' : '🔗'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                     <div className="text-[10px] font-bold text-gray-900 truncate group-hover:text-purple-700 transition-colors">{s.title}</div>
                                     <div className="text-[8px] font-bold text-gray-400 uppercase tracking-tight mt-0.5">
                                       {s.type} • Source [{idx + 1}]
                                     </div>
                                  </div>
                                </a>
                              ))}
                           </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {isThinking && (
                <div className="flex flex-col gap-3 animate-in fade-in duration-500">
                  <div className="flex items-center gap-1.5 ml-1">
                     <div className="w-1 h-1 rounded-full bg-purple-400 animate-pulse"></div>
                     <span className="text-[8px] font-bold text-purple-400 uppercase tracking-widest">Neural Synthesis...</span>
                  </div>
                  <div className="max-w-[80%] p-4 bg-white border border-gray-100 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                     <div className="w-1.5 h-1.5 bg-purple-200 rounded-full animate-bounce"></div>
                     <div className="w-1.5 h-1.5 bg-purple-200 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                     <div className="w-1.5 h-1.5 bg-purple-200 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              )}

              {chatError && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl animate-in zoom-in-95 duration-300">
                  <p className="text-[11px] text-red-600 font-medium mb-3">{chatError}</p>
                  <button 
                    onClick={() => handleSendMessage(undefined, messages[messages.length-1]?.role === 'user' ? messages[messages.length-1].content : undefined)}
                    className="text-[10px] font-bold text-red-600 uppercase tracking-widest hover:underline"
                  >
                    Retry Synthesis
                  </button>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-50 bg-white">
              <form onSubmit={handleSendMessage} className="relative">
                <input 
                  type="text"
                  value={chatQuery}
                  onChange={(e) => setChatQuery(e.target.value)}
                  placeholder="Ask your brain..."
                  disabled={isThinking}
                  className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[12px] font-medium focus:outline-none focus:ring-2 focus:ring-purple-600/10 focus:border-purple-600 transition-all disabled:opacity-50"
                />
                <button 
                  type="submit"
                  disabled={!chatQuery.trim() || isThinking}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-30 transition-all shadow-md shadow-purple-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Focused Note Analysis */
          <div className="p-5 space-y-7">
            <button 
              onClick={onClearSelection}
              className="flex items-center gap-1.5 text-gray-400 hover:text-purple-600 transition-all mb-1 group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-widest">Back to Brain</span>
            </button>

            {(!aiStatus) ? (
              /* IDLE STATE: On-Demand CTA */
              <div className="space-y-6 py-4">
                <div className="p-6 bg-purple-50/10 border border-dashed border-purple-200/50 rounded-2xl flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-5 rotate-3 shadow-sm">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  </div>
                  <h3 className="text-[14px] font-bold text-gray-900 mb-2 tracking-tight">Ready for Synthesis</h3>
                  <p className="text-[11.5px] text-gray-500 font-medium leading-relaxed mb-6 px-4">
                    Trigger our Neural Engine to extract semantic patterns and summarize this note.
                  </p>
                  <button 
                    onClick={() => selectedContent?._id && onRetry?.(selectedContent._id)}
                    className="w-full py-3 bg-purple-600 text-white text-[11px] font-bold rounded-xl hover:bg-purple-700 transition-all shadow-md shadow-purple-200 uppercase tracking-widest"
                  >
                    Generate Insight
                  </button>
                </div>
                
                {/* Instant Metadata Preview */}
                {selectedContent?.aiMetadata && (
                   <section className="px-1">
                      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Preview</h3>
                      <div className="grid grid-cols-2 gap-3">
                         <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100/50">
                            <div className="text-[9px] font-bold text-gray-400 uppercase mb-1">Source</div>
                            <div className="text-[11px] font-bold text-gray-900">{selectedContent.aiMetadata.domain}</div>
                         </div>
                         <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100/50">
                            <div className="text-[9px] font-bold text-gray-400 uppercase mb-1">Type</div>
                            <div className="text-[11px] font-bold text-gray-900 capitalize">{selectedContent.aiMetadata.contentType}</div>
                         </div>
                      </div>
                   </section>
                )}
              </div>
            ) : aiStatus === "queued" || aiStatus === "processing" || aiStatus === "summarized" ? (
              /* PROGRESSIVE LOADING: Staged Knowledge Reveal */
              <div className="space-y-7">
                {/* Instant Metadata: No Wait Time */}
                {selectedContent?.aiMetadata && (
                  <section className="p-4 bg-purple-50/10 rounded-2xl border border-purple-100/20">
                    <h3 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-3">Instant Metadata</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Source</div>
                        <div className="text-[13px] font-bold text-gray-900">{selectedContent.aiMetadata.domain}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Format</div>
                        <div className="text-[13px] font-bold text-gray-900 capitalize">{selectedContent.aiMetadata.contentType}</div>
                      </div>
                    </div>
                  </section>
                )}

                {/* Progressive Status: Multi-Stage Feedback */}
                <div className="px-4 py-4 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
                    <span className="text-[11px] font-bold text-purple-600 uppercase tracking-[0.1em]">Knowledge Extraction</span>
                  </div>
                  
                  <div className="space-y-4">
                     <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight">
                           <span className={aiStatus !== "queued" ? "text-purple-600" : "text-gray-300"}>
                              {aiStatus !== "queued" ? "✓" : "⟳"} Parsing Source
                           </span>
                           <span className={(aiStatus === "summarized" || (aiStatus as string) === "completed") ? "text-purple-600" : "text-gray-300"}>
                              {(aiStatus === "summarized" || (aiStatus as string) === "completed") ? "✓" : "⟳"} Entity Extraction
                           </span>
                        </div>
                        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                           <div 
                              className="h-full bg-purple-500 transition-all duration-1000 ease-out"
                              style={{ width: aiStatus === "queued" ? "25%" : aiStatus === "processing" ? "65%" : "90%" }}
                           ></div>
                        </div>
                     </div>
                     <p className="text-[10.5px] text-gray-400 font-medium italic leading-relaxed">
                        {aiStatus === "queued" ? "Initializing neural handshake..." : 
                         aiStatus === "processing" ? "Analyzing semantic structures and themes..." : 
                         "Finalizing knowledge synthesis..."}
                     </p>
                     
                     {isSlowAnalysis && (
                        <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-500">
                           <p className="text-[10px] font-bold text-amber-600/80 bg-amber-50/50 px-3 py-2 rounded-xl border border-amber-100/50">
                              Analysis is taking a bit longer. We'll continue processing in the background while you browse.
                           </p>
                        </div>
                     )}
                  </div>
                </div>

                {/* Skeletons for Pending Sections */}
                <section className="opacity-40 space-y-4">
                   <div className="space-y-2">
                      <div className="h-2 bg-gray-100 rounded-full w-1/3"></div>
                      <div className="h-2.5 bg-gray-50 rounded-full w-full animate-pulse"></div>
                      <div className="h-2.5 bg-gray-50 rounded-full w-[90%] animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                   </div>
                   <div className="space-y-2 pt-2">
                      <div className="h-2 bg-gray-100 rounded-full w-1/4"></div>
                      <div className="h-12 bg-gray-50 rounded-xl w-full"></div>
                   </div>
                </section>
              </div>
            ) : isFailed ? (
              /* FAILED STATE: Clear & Accurate Feedback */
              <div className="space-y-6 py-4">
                <div className="p-5 bg-red-50 border border-red-100 rounded-2xl flex flex-col items-center text-center">
                  <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                  </div>
                  <h3 className="text-[13px] font-bold text-gray-900 mb-1">Analysis Failed</h3>
                  <p className="text-[11px] text-red-500/80 font-medium leading-relaxed mb-6 px-2">
                    {selectedContent?.aiError || "AI was unable to synthesize this note. This may be due to a network timeout or resource limits."}
                  </p>
                  <button 
                    onClick={() => selectedContent?._id && onRetry?.(selectedContent._id)}
                    className="w-full py-2.5 bg-white border border-red-200 text-red-600 text-[11px] font-bold rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                  >
                    Retry Analysis
                  </button>
                </div>
              </div>
            ) : selectedContent ? (
              /* COMPLETED INSIGHT: High Information Density */
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {/* Summary Section */}
                <section>
                  <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Knowledge Synthesis</h3>
                    <span className="text-[9px] font-bold text-purple-400 uppercase tracking-widest bg-purple-50 px-2 py-0.5 rounded-full">
                      Optimized Preview
                    </span>
                  </div>
                  <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm leading-relaxed text-[13.5px] text-gray-700 font-medium tracking-tight">
                    {selectedContent.description || "No analysis available for this item."}
                  </div>
                </section>

                {/* Semantic Attributes */}
                <div className="grid grid-cols-1 gap-6">
                  {/* Tags & Topics Cluster */}
                  <section>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Semantic Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedContent.tags?.map((tag) => (
                        <span key={tag} className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-xl text-[11px] font-bold border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-colors">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </section>

                  {/* Neural Clusters (Topics) */}
                  {selectedContent.topics && selectedContent.topics.length > 0 && (
                    <section>
                      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Domain relevance</h3>
                      <div className="space-y-2">
                        {selectedContent.topics.map(topic => (
                          <div key={topic} className="flex items-center gap-2 group cursor-pointer p-1 -ml-1 rounded-lg hover:bg-gray-50 transition-all">
                            <div className="w-1 h-1 rounded-full bg-purple-200 group-hover:bg-purple-500 transition-all"></div>
                            <span className="text-[12.5px] font-bold text-gray-600 group-hover:text-gray-900 transition-colors tracking-tight">{topic}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
                
                <div className="pt-6 border-t border-gray-50 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">
                    Neural Engine • Analysis Stable
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Footer: Quiet Branding */}
      <div className="p-4 px-6 border-t border-gray-50 bg-gray-50/20">
        <div className="flex items-center gap-2 opacity-20 grayscale group-hover:opacity-40 transition-all">
          <div className="w-1 h-1 rounded-full bg-purple-600"></div>
          <span className="text-[8.5px] font-bold uppercase tracking-[0.25em] text-gray-900">Neural Engine V2.1</span>
        </div>
      </div>
    </div>
  );
}
