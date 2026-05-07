import { useEffect, useState } from "react";
import type { Content } from "../hooks/useContent";

interface AIInsightsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  contentCount: number;
  contents: Content[];
  selectedContent?: Content;
  onClearSelection?: () => void;
  onRetry?: (id: string) => void;
}

export function AIInsightsPanel({
  isOpen,
  onClose,
  contentCount,
  contents,
  selectedContent,
  onClearSelection,
  onRetry
}: AIInsightsPanelProps) {
  const [activeTab, setActiveTab] = useState<"brain" | "note">(selectedContent ? "note" : "brain");
  const aiStatus = selectedContent?.aiStatus;
  const isFailed = aiStatus === "failed";

  useEffect(() => {
    if (selectedContent) {
      setActiveTab("note");
    } else {
      setActiveTab("brain");
    }
  }, [selectedContent]);

  return (
    <div
      className={`fixed right-0 top-0 h-screen w-80 bg-white border-l border-gray-100 transition-all duration-300 ease-in-out z-40 flex flex-col shadow-2xl ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header: Quiet & Contextual */}
      <div className="p-4 px-5 border-b border-gray-50 flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-[13px] font-bold text-gray-900 tracking-tight">AI Insights</h2>
          <span className="text-[9px] font-bold text-purple-400 uppercase tracking-[0.15em] mt-0.5">
            {activeTab === "brain" ? "Neural Overview" : "Note Synthesis"}
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

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === "brain" ? (
          /* Global Brain Insights: High Density Pattern Recognition */
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
        ) : (
          /* Focused Note Analysis: Editorial Deep Dive */
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

            {aiStatus === "queued" || aiStatus === "processing" || aiStatus === "summarized" ? (
              /* PROGRESSIVE LOADING: Staged Feedback */
              <div className="space-y-7">
                <div className="px-4 py-4 bg-purple-50/20 rounded-2xl border border-purple-100/20">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></div>
                    <span className="text-[11px] font-bold text-purple-600 uppercase tracking-[0.1em]">Neural Engine Active</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className={aiStatus !== "queued" ? "text-purple-600" : "text-gray-300"}>
                        {aiStatus !== "queued" ? "✓" : "⟳"} Parsing Content
                      </span>
                      <span className={(aiStatus === "summarized" || (aiStatus as string) === "completed") ? "text-purple-600" : "text-gray-300"}>
                        {(aiStatus === "summarized" || (aiStatus as string) === "completed") ? "✓" : "⟳"} Metadata
                      </span>
                    </div>
                    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 transition-all duration-1000 ease-out"
                        style={{ width: aiStatus === "queued" ? "20%" : aiStatus === "processing" ? "60%" : "90%" }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium italic">
                      {aiStatus === "queued" ? "Initializing knowledge extraction..." : 
                       aiStatus === "processing" ? "Analyzing semantic patterns..." : 
                       "Finalizing neural connections..."}
                    </p>
                  </div>
                </div>

                {/* Instant Metadata: Show what we know immediately */}
                {selectedContent?.aiMetadata && (
                  <section className="p-4 bg-gray-50/50 rounded-xl border border-gray-100/50">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Instant Metadata</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Source</div>
                        <div className="text-[12px] font-bold text-gray-900">{selectedContent.aiMetadata.domain}</div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Format</div>
                        <div className="text-[12px] font-bold text-gray-900 capitalize">{selectedContent.aiMetadata.contentType}</div>
                      </div>
                    </div>
                  </section>
                )}

                <section className="opacity-40 grayscale">
                  <h3 className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.1em] mb-3 ml-1">Summary Preview</h3>
                  <div className="space-y-2">
                    <div className="h-2.5 bg-gray-100 rounded-full w-full animate-pulse"></div>
                    <div className="h-2.5 bg-gray-100 rounded-full w-[90%] animate-pulse" style={{ animationDelay: '0.2s' }}></div>
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
                    {selectedContent?.embeddingStatus === 'failed' 
                      ? (selectedContent?.aiError || "The AI service returned a 404 or a server error. Check if the backend route is registered and the server is restarted.")
                      : "AI was unable to synthesize this note. This may be due to a missing endpoint or a network timeout."}
                  </p>
                  <button 
                    onClick={() => selectedContent?._id && onRetry?.(selectedContent._id)}
                    className="w-full py-2.5 bg-white border border-red-200 text-red-600 text-[11px] font-bold rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                  >
                    Retry Analysis
                  </button>
                  <p className="mt-4 text-[9px] text-gray-400 font-bold uppercase tracking-tight">
                    Error Code: {selectedContent?.type === 'video' ? 'VIDEO_FAIL' : 'GENERIC_FAIL'}
                  </p>
                </div>
              </div>
            ) : (
              /* COMPLETED CONTENT: Editorial Quality */
              <div className="space-y-7">
                <section>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-3 ml-1">Summary</h3>
                  <p className="text-[14px] text-gray-700 leading-[1.6] font-medium tracking-tight">
                    {selectedContent?.description || "A concise AI summary will appear here once synthesized."}
                  </p>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-3 ml-1">Semantic Context</h3>
                  <div className="space-y-3">
                    <div className="p-3.5 bg-purple-50/10 rounded-xl border border-purple-100/10 group">
                      <div className="text-[11px] font-bold text-purple-700/80 mb-1 uppercase tracking-tight">Key Pattern</div>
                      <p className="text-[12px] text-purple-600/70 leading-relaxed font-medium">
                        Strong alignment with your "Machine Learning" research track.
                      </p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-3 ml-1">Suggested Taxonomy</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedContent?.tags?.map((tag: string) => (
                      <span key={tag} className="px-2 py-1 bg-gray-50/80 border border-gray-100 text-[10px] font-bold text-gray-400 rounded-md uppercase tracking-tight hover:text-purple-600 hover:border-purple-100 transition-all cursor-default">
                        #{tag}
                      </span>
                    ))}
                    {(!selectedContent?.tags || selectedContent.tags.length === 0) && (
                      <span className="text-[11px] text-gray-400 font-medium italic ml-1">Awaiting synthesis...</span>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-3 ml-1">Neural Connections</h3>
                  <div className="space-y-2">
                    {selectedContent?.topics?.map((topic: string) => (
                      <div key={topic} className="flex items-center gap-2 group cursor-pointer p-1 -ml-1 rounded-lg hover:bg-gray-50 transition-all">
                        <div className="w-1 h-1 rounded-full bg-purple-200 group-hover:bg-purple-500 transition-all"></div>
                        <span className="text-[12.5px] font-bold text-gray-600 group-hover:text-gray-900 transition-colors tracking-tight">{topic}</span>
                      </div>
                    ))}
                    {(!selectedContent?.topics || selectedContent.topics.length === 0) && (
                      <span className="text-[11px] text-gray-400 font-medium italic ml-1">No connections mapped.</span>
                    )}
                  </div>
                </section>
              </div>
            )}
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
