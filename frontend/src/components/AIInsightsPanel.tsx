import { useEffect, useState } from "react";
import type { Content } from "../hooks/useContent";
import axios from "axios";
import { BACKEND_URL } from "../config";

interface AIInsightsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  contentCount: number;
  contents: Content[];
  selectedContent?: Content;
  onClearSelection?: () => void;
  onRetry?: (id: string) => void;
  isSlowAnalysis?: boolean;
}

export function AIInsightsPanel({
  isOpen,
  onClose,
  contentCount,
  contents,
  selectedContent,
  onClearSelection,
  onRetry,
  isSlowAnalysis
}: AIInsightsPanelProps) {
  const [activeTab, setActiveTab] = useState<"brain" | "note" | "chat">("brain");
  const [chatQuery, setChatQuery] = useState("");
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string, sources?: any[]}[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const aiStatus = selectedContent?.aiStatus;
  const isFailed = aiStatus === "failed";

  useEffect(() => {
    if (selectedContent) {
      setActiveTab("note");
    } else if (activeTab !== "chat") {
      setActiveTab("brain");
    }
  }, [selectedContent]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim() || isTyping) return;

    const userQuery = chatQuery;
    setChatQuery("");
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setIsTyping(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/v1/ai/chat`, 
        { query: userQuery },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );

      if (response.data.success) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response.data.answer,
          sources: response.data.sources 
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm sorry, I encountered an error while searching your brain." 
      }]);
    } finally {
      setIsTyping(false);
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
          /* Global Brain Insights */
          <div className="p-5 space-y-7">
             <section>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-3 ml-1">Distribution</h3>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100/50">
                  <div className="text-[15px] font-bold text-gray-900">{contentCount}</div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tight mt-0.5">Knowledge items</div>
                </div>
                <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-100/50">
                  <div className="text-[15px] font-bold text-gray-900">{contents.reduce((acc, c) => acc + (c.tags?.length || 0), 0)}</div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tight mt-0.5">Semantic Tags</div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-3 ml-1">Emerging Patterns</h3>
              <div className="space-y-3">
                <div className="p-3.5 bg-white border border-gray-100 rounded-xl hover:border-purple-100 transition-all cursor-default group">
                  <div className="text-[11.5px] font-bold text-gray-900 mb-1 group-hover:text-purple-700 transition-colors">Knowledge Cluster</div>
                  <div className="text-[11.5px] text-gray-500 leading-normal font-medium">
                    Strong focus on "Web Development" detected across 4 recent notes.
                  </div>
                </div>
                <div className="p-3.5 bg-white border border-gray-100 rounded-xl hover:border-purple-100 transition-all cursor-default group">
                  <div className="text-[11.5px] font-bold text-gray-900 mb-1 group-hover:text-purple-700 transition-colors">Semantic Bridge</div>
                  <div className="text-[11.5px] text-gray-500 leading-normal font-medium">
                    Connections found between your "Productivity" and "Note-taking" topics.
                  </div>
                </div>
              </div>
            </section>
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
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[90%] p-3.5 rounded-2xl text-[12.5px] font-medium leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white border border-gray-100 text-gray-800'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1.5 w-full">
                       <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Sources</span>
                       <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map((s, idx) => (
                            <a 
                              key={idx} 
                              href={s.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="px-2 py-1 bg-white border border-gray-100 rounded-lg text-[10px] font-bold text-purple-600 hover:border-purple-200 transition-all shadow-xs"
                            >
                              [{idx + 1}] {s.title.substring(0, 20)}...
                            </a>
                          ))}
                       </div>
                    </div>
                  )}
                </div>
              ))}
              
              {isTyping && (
                <div className="flex items-center gap-1.5 px-1">
                   <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"></div>
                   <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                   <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-50 bg-white">
              <form onSubmit={handleSendMessage} className="relative">
                <input 
                  type="text"
                  value={chatQuery}
                  onChange={(e) => setChatQuery(e.target.value)}
                  placeholder="Ask your brain..."
                  className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-xl text-[12px] font-medium focus:outline-none focus:ring-2 focus:ring-purple-600/10 focus:border-purple-600 transition-all"
                />
                <button 
                  type="submit"
                  disabled={!chatQuery.trim() || isTyping}
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
