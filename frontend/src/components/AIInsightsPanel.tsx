import { useEffect, useState, useRef, useMemo } from "react";
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
  const [activeTab, setActiveTab] = useState<"overview" | "deep-dive" | "connections" | "chat">("overview");
  const [chatQuery, setChatQuery] = useState("");
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string, sources?: any[]}[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

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

  const fetchIntelligence = async () => {
    setIsIntelligenceLoading(true);
    setIntelligenceError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/ai/insights`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`Neural engine error: ${response.status}`);
      const data = await response.json();
      if (data.success) setBrainIntelligence(data.data);
      else throw new Error(data.message || "Failed to synthesize patterns.");
    } catch (err: any) {
      setIntelligenceError(err.name === 'AbortError' ? "Neural engine timed out." : err.message);
    } finally {
      setIsIntelligenceLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, retryQuery?: string) => {
    if (e) e.preventDefault();
    const userQuery = retryQuery || chatQuery;
    if (!userQuery.trim() || isThinking) return;
    setChatError(null);
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
      setChatError(error.code === 'ECONNABORTED' ? "Neural engine timed out." : (error.response?.data?.error || "Synthesis failed."));
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

                {/* Synthesis Section */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Synthesis</span>
                  </div>
                  <div className="bg-purple-50/20 p-6 rounded-[24px] border border-purple-100/20">
                    <p className="text-[14px] text-gray-600 font-medium leading-relaxed antialiased">
                      {sections.short || "Neural engine is processing this node..."}
                    </p>
                  </div>
                </section>

                {/* Key Takeaways */}
                <section className="space-y-4">
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Core Intelligence</span>
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
