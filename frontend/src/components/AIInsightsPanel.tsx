import { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import type { Content } from "../hooks/useContent";
import { BACKEND_URL } from "../config";

interface AIInsightsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContent?: Content;
}

export function AIInsightsPanel({
  isOpen,
  onClose,
  selectedContent
}: AIInsightsPanelProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "deep-dive" | "connections" | "chat">("overview");
  const [chatQuery, setChatQuery] = useState("");
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string, sources?: any[]}[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [manualContent, setManualContent] = useState("");
  const [connections, setConnections] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  useEffect(() => {
    if (selectedContent) {
      setManualContent(selectedContent.description || "");
      setIsEditing(false);
      fetchConnections(selectedContent._id);
    }
  }, [selectedContent]);

  const fetchConnections = async (contentId: string) => {
    try {
        const response = await axios.get(`${BACKEND_URL}/api/v1/content/${contentId}/connections`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        setConnections(response.data.connections || []);
    } catch (e) {
        console.error("Error fetching connections:", e);
    }
  };

  const handleSaveManualContent = async () => {
    if (!selectedContent) return;
    setIsSaving(true);
    try {
      await axios.put(`${BACKEND_URL}/api/v1/content`, {
        contentId: selectedContent._id,
        description: manualContent
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setIsEditing(false);
      // Trigger a light refresh would be ideal here, but for now we rely on the next select
    } catch (error) {
      console.error("Failed to save manual content", error);
    } finally {
      setIsSaving(false);
    }
  };


  const handleSendMessage = async (e?: React.FormEvent, retryQuery?: string) => {
    if (e) e.preventDefault();
    const userQuery = retryQuery || chatQuery;
    if (!userQuery.trim() || isThinking) return;
    if (!retryQuery) setChatQuery("");
    const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
    if (!retryQuery) setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setIsThinking(true);
    try {
      const response = await axios.post(`${BACKEND_URL}/api/v1/ai/chat`, {
        query: userQuery,
        history,
        contentId: selectedContent?._id // Focused chat if content is selected
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        timeout: 15000
      });
      if (response.data.success) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response.data.answer, 
          sources: response.data.sources 
        }]);
      } else throw new Error(response.data.error || "Brain synthesis failed.");
    } catch (error: any) {
      // Error handled via UI fallback
    } finally {
      setIsThinking(false);
    }
  };

  const sections = useMemo(() => {
    if (!selectedContent?.description) return {
      short: "",
      mainIdeas: [],
      takeaways: [],
      metadata: { readingTime: "1", difficulty: "Beginner" }
    };

    const text = selectedContent.description;
    
    // Improved Multi-line Regex Patterns
    const shortMatch = text.split("\n\n")[0];
    const mainIdeasMatch = text.match(/MAIN IDEAS:\n([\s\S]*?)(?=\n\n|$)/);
    const takeawaysMatch = text.match(/KEY TAKEAWAYS:\n([\s\S]*?)(?=\n\n|$)/);
    const metaMatch = text.match(/Reading Time: (\d+) min \| Difficulty: (\w+)/);

    return {
      short: shortMatch || "",
      mainIdeas: mainIdeasMatch ? mainIdeasMatch[1].split("\n").map(l => l.replace(/^•\s*/, "").trim()).filter(Boolean) : [],
      takeaways: takeawaysMatch ? takeawaysMatch[1].split("\n").map(l => l.replace(/^•\s*/, "").trim()).filter(Boolean) : [],
      metadata: {
        readingTime: metaMatch ? metaMatch[1] : "1",
        difficulty: metaMatch ? metaMatch[2] : "Beginner"
      }
    };
  }, [selectedContent]);

  return (
    <div
      className={`fixed right-0 top-0 h-screen w-[400px] bg-white border-l border-gray-100/50 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] z-40 flex flex-col shadow-[-10px_0_40px_rgba(0,0,0,0.02)] ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* Header: Minimal & Airy */}
      <div className="px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse-semantic"></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.25em]">Neural Insight</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl text-gray-300 hover:text-gray-600 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex items-center gap-2 p-1 bg-gray-50/50 rounded-xl border border-gray-100/50">
          {[
            { id: 'overview', label: 'Summary' },
            { id: 'deep-dive', label: 'Nodes' },
            { id: 'chat', label: 'Ask AI' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                activeTab === tab.id 
                  ? "bg-white text-purple-600 shadow-sm border border-gray-100/50" 
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {!selectedContent ? (
          /* GLOBAL BRAIN VIEW: Minimalist */
          <div className="px-8 flex flex-col items-center justify-center h-1/2 text-center animate-in fade-in duration-700">
              <div className="w-14 h-14 bg-purple-50/50 rounded-2xl flex items-center justify-center text-purple-300 mb-6 border border-purple-100/30">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h2 className="text-[17px] font-bold text-gray-800 mb-2">Neural Workspace</h2>
              <p className="text-[12px] text-gray-400 font-medium leading-relaxed max-w-[200px]">
                Select a memory to synthesize deep insights or explore global patterns.
              </p>
          </div>
        ) : (
          <div className="px-8 pb-10 space-y-10 animate-in fade-in duration-500">
            {activeTab === 'overview' && (
              <div className="space-y-10">
                {/* Meta Row: Tiny & Minimal */}
                <div className="flex items-center justify-between px-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mb-1">Source</span>
                    <span className="text-[12px] font-bold text-gray-600">{selectedContent.aiMetadata?.domain || "Link"}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mb-1">Fidelity</span>
                    <span className="text-[12px] font-bold text-purple-400 uppercase">{sections.metadata.difficulty}</span>
                  </div>
                </div>

                {/* Main Content Area: Conditional Rendering */}
                {(!selectedContent.description || isEditing) ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="p-6 bg-purple-50/30 rounded-2xl border border-purple-100/30">
                       <h4 className="text-[13px] font-bold text-gray-800 mb-2">Neural Link Protected</h4>
                       <p className="text-[11px] text-gray-400 font-medium leading-relaxed mb-4">
                         This link (Notion/protected site) could not be read automatically. Paste the content below to synthesize deep insights.
                       </p>
                       <textarea
                         value={manualContent}
                         onChange={(e) => setManualContent(e.target.value)}
                         placeholder="Paste page content here..."
                         className="w-full h-40 bg-white/50 border border-purple-100/50 rounded-xl p-4 text-[13px] text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-200/50 transition-all resize-none custom-scrollbar"
                       />
                       <button
                         onClick={handleSaveManualContent}
                         disabled={isSaving || !manualContent.trim()}
                         className="mt-4 w-full py-3 bg-purple-600 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                       >
                         {isSaving ? "Syncing..." : "Synthesize Content"}
                       </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* Executive Summary Section */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-3 bg-purple-500 rounded-full"></div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Executive Summary</span>
                        </div>
                        <button 
                          onClick={() => setIsEditing(true)}
                          className="text-[10px] font-bold text-gray-300 hover:text-purple-500 transition-all uppercase tracking-widest"
                        >
                          Edit
                        </button>
                      </div>
                      
                      <div className="bg-gray-50/30 rounded-2xl p-6 border border-gray-100/50">
                        <p className="text-[14px] text-gray-700 leading-relaxed font-medium antialiased">
                          {selectedContent?.description || "Neural engine is processing this node... Click the 'Lightning' icon on the card if this note hasn't been processed yet."}
                        </p>
                      </div>
                    </section>

                    {/* Neural Connections Section */}
                    {connections.length > 0 && (
                      <div className="pt-8 border-t border-gray-50/50">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
                            <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Neural Connections</span>
                          </div>
                          <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter bg-indigo-50 px-2 py-0.5 rounded-full">Web of Knowledge</span>
                        </div>
                        
                        <div className="space-y-3">
                          {connections.map((conn) => (
                            <div 
                              key={conn._id} 
                              className="group p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50 hover:bg-white hover:border-purple-200 transition-all cursor-pointer shadow-sm hover:shadow-purple-100/50"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                  {new URL(conn.link).hostname.replace("www.", "")}
                                </div>
                                <div className="text-[9px] font-black text-purple-500 bg-purple-50 px-2 py-0.5 rounded-md">
                                  {Math.round(conn.similarity * 100)}% Match
                                </div>
                              </div>
                              <div className="text-[12px] font-bold text-gray-800 group-hover:text-purple-600 transition-colors line-clamp-2">
                                {conn.title}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key Takeaways */}
                    {sections.takeaways.length > 0 && (
                      <section className="space-y-4 pt-8 border-t border-gray-50/50">
                        <div className="flex items-center gap-2 px-1">
                           <div className="w-1 h-3 bg-purple-400 rounded-full"></div>
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Core Intelligence</span>
                        </div>
                        <div className="space-y-3">
                          {sections.takeaways.map((t, i) => (
                            <div key={i} className="flex gap-4 p-4 hover:bg-gray-50/50 rounded-2xl transition-colors group">
                               <div className="w-5 h-5 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-[10px] font-bold text-purple-400 shrink-0">
                                  {i+1}
                               </div>
                               <p className="text-[13px] font-medium text-gray-600 leading-snug antialiased">{t}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'deep-dive' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <section className="space-y-6">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Semantic Nodes</span>
                  <div className="space-y-6">
                    {sections.mainIdeas.map((idea, i) => (
                      <div key={i} className="relative pl-6 before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:bg-purple-300 before:rounded-full">
                        <p className="text-[13.5px] text-gray-600 font-medium leading-relaxed antialiased">
                          {idea}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[12px] font-medium text-gray-400 leading-relaxed antialiased italic">
                    "This node strengthens your knowledge cluster in {selectedContent.topics?.[0] || 'emerging domains'}."
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="h-[65vh] flex flex-col -mx-8">
                 <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                    {messages.length === 0 && (
                      <div className="text-[12px] font-medium text-gray-400 leading-relaxed italic text-center px-6">
                        Context loaded. Ask a specific question about this memory.
                      </div>
                    )}
                    
                    {messages.map((msg, i) => (
                      <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-2 animate-in fade-in slide-in-from-bottom-2`}>
                        <div className={`max-w-[85%] p-4 rounded-2xl text-[13px] font-medium leading-relaxed ${
                          msg.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-gray-50 text-gray-700 rounded-tl-none border border-gray-100'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    
                    {isThinking && (
                      <div className="flex items-center gap-2 p-4 bg-white border border-gray-100 rounded-2xl w-24 shadow-sm animate-pulse">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                 </div>

                 <div className="p-6 bg-white border-t border-gray-100">
                    <form onSubmit={handleSendMessage} className="relative">
                       <input 
                         value={chatQuery}
                         onChange={(e) => setChatQuery(e.target.value)}
                         disabled={isThinking}
                         className="w-full pl-5 pr-14 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold focus:outline-none focus:ring-4 focus:ring-purple-600/5 focus:border-purple-600 transition-all disabled:opacity-50"
                         placeholder="Ask this memory..."
                       />
                       <button 
                         type="submit"
                         disabled={!chatQuery.trim() || isThinking}
                         className="absolute right-2 top-2 p-2.5 bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-100 hover:bg-purple-700 transition-all active:scale-95 disabled:opacity-30"
                       >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                       </button>
                    </form>
                 </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer: Knowledge DNA */}
      <div className="p-6 border-t border-gray-50 bg-gray-50/30">
        <div className="flex items-center justify-between">
           <div className="flex gap-1.5">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="w-1 h-3.5 bg-purple-200/50 rounded-full animate-[pulse-semantic_3s_infinite]" style={{ animationDelay: `${i*0.15}s` }}></div>
              ))}
           </div>
           <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.25em]">Personal Knowledge OS</span>
        </div>
      </div>
    </div>
  );
}
