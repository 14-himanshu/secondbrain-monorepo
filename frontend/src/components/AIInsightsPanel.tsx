import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import type { Content } from "../hooks/useContent";
import { getConnections, updateContent } from "../services/content.api";
import { aiService } from "../services/ai.service";

interface AIInsightsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContent?: Content;
}

type Connection = { _id: string; title: string; link: string; similarity: number };

type OverviewSections = {
  short: string;
  mainIdeas: string[];
  takeaways: string[];
  metadata: { readingTime: string; difficulty: string };
};

// ─── Left Column: Summary, Connections, Nodes ─────────────────────────────────
function SummaryColumn({
  selectedContent,
  connections,
  sections,
}: {
  selectedContent: Content;
  connections: Connection[];
  sections: OverviewSections;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [manualContent, setManualContent] = useState(selectedContent.description || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveManualContent = async () => {
    setIsSaving(true);
    try {
      await updateContent({ contentId: selectedContent._id, description: manualContent });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save manual content", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full overflow-y-auto custom-scrollbar pr-2 space-y-6">

      {/* Meta Row */}
      <div className="flex items-center gap-3 p-4 bg-purple-50/40 dark:bg-purple-900/20 rounded-2xl border border-purple-100/60 dark:border-purple-800/40">
        <div className="flex-1">
          <div className="text-[9px] font-bold text-purple-700/80 dark:text-purple-400/80 uppercase tracking-[0.2em] mb-1">Source</div>
          <div className="text-[12px] font-bold text-purple-900 dark:text-purple-300 truncate">
            {selectedContent.aiMetadata?.domain || (selectedContent.link ? (() => { try { return new URL(selectedContent.link).hostname.replace(/^www\./, ''); } catch { return "Link"; } })() : "Link")}
          </div>
        </div>
        <div className="w-px h-8 bg-purple-100 dark:bg-purple-800/60" />
        <div className="flex-1 text-right">
          <div className="text-[9px] font-bold text-purple-700/80 dark:text-purple-400/80 uppercase tracking-[0.2em] mb-1">Fidelity</div>
          <div className="text-[12px] font-bold text-purple-600 dark:text-purple-400 uppercase">
            {sections.metadata.difficulty}
          </div>
        </div>
        <div className="w-px h-8 bg-purple-100 dark:bg-purple-800/60" />
        <div className="flex-1 text-right">
          <div className="text-[9px] font-bold text-purple-700/80 dark:text-purple-400/80 uppercase tracking-[0.2em] mb-1">Read Time</div>
          <div className="text-[12px] font-bold text-purple-600 dark:text-purple-400">
            {sections.metadata.readingTime} min
          </div>
        </div>
      </div>

      {/* Content: Protected or Summary */}
      {(!selectedContent.description || isEditing) ? (
        <div className="p-5 bg-purple-50/30 dark:bg-purple-900/20 rounded-2xl border border-purple-100/30 dark:border-purple-800/30 space-y-3 animate-in fade-in duration-300">
          <h4 className="text-[13px] font-bold text-gray-800 dark:text-gray-200">Neural Link Protected</h4>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium leading-relaxed">
            This link could not be read automatically. Paste the content below to synthesize deep insights.
          </p>
          <textarea
            value={manualContent}
            onChange={(e) => setManualContent(e.target.value)}
            placeholder="Paste page content here..."
            className="w-full h-32 bg-white/50 dark:bg-gray-800/50 border border-purple-100/50 dark:border-purple-800/50 rounded-xl p-4 text-[13px] text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-200/50 dark:focus:ring-purple-900/50 transition-all resize-none custom-scrollbar"
          />
          <button
            onClick={handleSaveManualContent}
            disabled={isSaving || !manualContent.trim()}
            className="w-full py-3 bg-purple-600 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {isSaving ? "Syncing..." : "Synthesize Content"}
          </button>
        </div>
      ) : (
        <>
          {/* Executive Summary */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-3.5 bg-purple-500 rounded-full" />
                <span className="text-[10px] font-bold text-purple-700/90 dark:text-purple-400/90 uppercase tracking-[0.15em]">Executive Summary</span>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="text-[10px] font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-all uppercase tracking-widest bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-md"
              >
                Edit
              </button>
            </div>
            <div className="bg-purple-50/40 dark:bg-purple-900/20 rounded-2xl p-5 shadow-sm">
              <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed font-medium antialiased">
                {sections.short || "Neural engine is processing this node... Click the 'Lightning' icon on the card if this note hasn't been processed yet."}
              </p>
            </div>
          </section>

          {/* Key Takeaways */}
          {sections.takeaways.length > 0 && (
            <section className="space-y-3 pt-4 border-t border-purple-50/50 dark:border-purple-900/30">
              <div className="flex items-center gap-2 px-1">
                <div className="w-1.5 h-3.5 bg-purple-400 rounded-full" />
                <span className="text-[10px] font-bold text-purple-700/90 dark:text-purple-400/90 uppercase tracking-[0.15em]">Core Intelligence</span>
              </div>
              <div className="space-y-2">
                {sections.takeaways.map((t, i) => (
                  <div key={i} className="flex gap-3 p-3.5 hover:bg-purple-50/30 dark:hover:bg-purple-900/20 rounded-xl transition-colors group border border-transparent hover:border-purple-50 dark:hover:border-purple-900/30">
                    <div className="w-5 h-5 rounded-full bg-purple-50 dark:bg-purple-900/30 border border-purple-100/60 dark:border-purple-800/60 flex items-center justify-center text-[10px] font-bold text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300 leading-relaxed antialiased">{t}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Tags / Topics */}
          {(selectedContent.tags?.length || selectedContent.topics?.length) ? (
            <section className="space-y-3 pt-4 border-t border-purple-50/50 dark:border-purple-900/30">
              <div className="flex items-center gap-2 px-1">
                <div className="w-1.5 h-3.5 bg-purple-200 rounded-full" />
                <span className="text-[10px] font-bold text-purple-700/80 dark:text-purple-400/80 uppercase tracking-[0.15em]">Knowledge Vectors</span>
              </div>
              <div className="flex flex-wrap gap-2 px-1">
                {[...new Set([...(selectedContent.topics || []), ...(selectedContent.tags || [])])].filter(Boolean).map((t, i) => (
                  <span key={i} className="px-3 py-1.5 bg-gray-50/80 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-[11px] font-bold border border-gray-200/60 dark:border-gray-700 shadow-sm">
                    #{t}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {/* Neural Connections */}
          {connections.length > 0 && (
            <section className="space-y-3 pt-4 border-t border-purple-50/50 dark:border-purple-900/30">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3 bg-purple-500 rounded-full" />
                  <span className="text-[10px] font-bold text-purple-700/90 dark:text-purple-400/90 uppercase tracking-[0.15em]">Neural Connections</span>
                </div>
                <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-tighter bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
                  {connections.length} linked
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {connections.map((conn) => (
                  <div
                    key={conn._id}
                    className="group p-3.5 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl border border-gray-100/50 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-800 hover:border-purple-200 dark:hover:border-purple-800 transition-all cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter truncate max-w-[60%]">
                        {(() => { try { return new URL(conn.link).hostname.replace("www.", ""); } catch { return "link"; } })()}
                      </div>
                      <div className="text-[9px] font-black text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-md shrink-0">
                        {Math.round(conn.similarity * 100)}% match
                      </div>
                    </div>
                    <div className="text-[12px] font-bold text-gray-800 dark:text-gray-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-2">
                      {conn.title}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ─── Right Column: Ask AI Chat ────────────────────────────────────────────────
function ChatColumn({
  selectedContent,
}: {
  selectedContent?: Content;
}) {
  const [chatQuery, setChatQuery] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string; sources?: Array<{ _id: string; title: string; link: string; type: string }>; actions?: string[] }[]
  >([]);
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Clear chat when content changes
  useEffect(() => {
    setMessages([]);
    setChatQuery("");
  }, [selectedContent?._id]);

  const handleSendMessage = async (e?: React.FormEvent, retryQuery?: string) => {
    if (e) e.preventDefault();
    const userQuery = retryQuery || chatQuery;
    if (!userQuery.trim() || isThinking) return;
    if (!retryQuery) setChatQuery("");

    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
    if (!retryQuery) setMessages((prev) => [...prev, { role: "user", content: userQuery }]);

    setIsThinking(true);
    // Add a placeholder message for the assistant
    setMessages((prev) => [...prev, { role: "assistant", content: "", sources: [], actions: [] }]);

    // Issue 10 FIX: Create AbortController so we can cancel the stream
    // if the user closes the panel or sends another message.
    const abortController = new AbortController();

    try {
      const response = await aiService.chat({
        query: userQuery,
        history,
        contentId: selectedContent?._id,
        signal: abortController.signal,
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      // Issue 9 FIX: isDone flag to break BOTH loops when [DONE] arrives.
      // Previously only the inner while broke, leaving the outer loop spinning.
      let isDone = false;

      while (!isDone) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
          const chunkStr = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);

          if (chunkStr.startsWith('data: ')) {
            const dataStr = chunkStr.replace('data: ', '').trim();
            if (dataStr === '[DONE]') { isDone = true; break; }
            if (!dataStr) { boundary = buffer.indexOf('\n\n'); continue; }

            try {
              const data = JSON.parse(dataStr);
              setMessages((prev) => {
                const newMessages = [...prev];
                // FIX: Spread into a NEW object so React Strict Mode's double-invocation
                // of this updater doesn't mutate the same reference twice (causing doubled text).
                const lastMsg = { ...newMessages[newMessages.length - 1] };
                newMessages[newMessages.length - 1] = lastMsg;

                if (data.type === 'metadata') {
                  lastMsg.sources = data.sources;
                } else if (data.type === 'action') {
                  lastMsg.actions = [...(lastMsg.actions || []), data.content];
                } else if (data.type === 'chunk') {
                  lastMsg.content = (lastMsg.content || '') + data.content;
                  // Clear action messages once real content arrives
                  if (lastMsg.actions && lastMsg.actions.length > 0) {
                    lastMsg.actions = [];
                  }
                } else if (data.type === 'error') {
                  lastMsg.content = `⚠️ ${data.content}`;
                }

                return newMessages;
              });
            } catch (e) {
              console.error("Failed to parse SSE chunk", e);
            }
          }
          boundary = buffer.indexOf('\n\n');
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: "Sorry, the agent encountered an error. Please try again.", sources: [] },
        ]);
      }
    } finally {
      setIsThinking(false);
    }
  };




  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      {/* Chat Header */}
      <div className="flex items-center gap-2 pb-4 border-b border-purple-50 dark:border-gray-800 shrink-0">
        <div className="w-1.5 h-3.5 bg-purple-500 rounded-full" />
        <span className="text-[10px] font-bold text-purple-700/90 dark:text-purple-400/90 uppercase tracking-[0.15em]">Ask AI</span>
        {selectedContent && (
          <span className="ml-auto text-[10px] font-medium text-gray-400 truncate max-w-[150px]">
            re: {selectedContent.title}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-4">
            <div className="w-12 h-12 bg-purple-50/50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center text-purple-300 dark:text-purple-500 border border-purple-100/30 dark:border-purple-800/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-[12px] font-medium text-gray-400 dark:text-gray-500 leading-relaxed">
              {selectedContent
                ? "Ask a question about this memory, or explore your whole brain."
                : "Select a memory card first, then ask a question."}
            </p>
            {selectedContent && (
              <div className="w-full space-y-2">
                {["Summarize the key points", "What are the main takeaways?", "How does this connect to other ideas?"].map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSendMessage(undefined, q)}
                    className="w-full text-left px-4 py-2.5 bg-purple-50/50 dark:bg-purple-900/20 hover:bg-purple-100/60 dark:hover:bg-purple-900/40 border border-purple-200/60 dark:border-purple-800/50 rounded-xl text-[12px] font-bold text-purple-900 dark:text-purple-200 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} gap-2 animate-in fade-in slide-in-from-bottom-2`}
          >
            <div
              className={`max-w-[90%] p-3.5 rounded-2xl text-[13px] font-medium leading-relaxed ${
                msg.role === "user"
                  ? "bg-purple-600 text-white rounded-tr-none"
                  : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-tl-none border border-gray-100 dark:border-gray-700"
              }`}
            >
              {msg.role === "assistant" && msg.actions && msg.actions.length > 0 && (
                <div className="mb-3 space-y-1.5">
                  {msg.actions.map((action, aIdx) => (
                    <div key={aIdx} className="flex items-center gap-2 text-[11px] text-purple-600/80 dark:text-purple-400/80 font-bold bg-purple-50/50 dark:bg-purple-900/20 px-2 py-1 rounded-md max-w-fit">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                      {action}
                    </div>
                  ))}
                </div>
              )}
              {msg.role === "user" ? (
                msg.content
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none text-[13.5px] leading-[1.65] 
                  prose-p:mb-4 last:prose-p:mb-0 
                  prose-headings:font-bold prose-headings:mb-3 prose-headings:mt-5 
                  prose-h1:text-[16px] prose-h2:text-[15px] prose-h3:text-[14px]
                  prose-a:text-purple-600 dark:prose-a:text-purple-400 prose-a:no-underline hover:prose-a:underline prose-a:font-semibold
                  prose-strong:font-bold prose-strong:text-gray-900 dark:prose-strong:text-white
                  prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:bg-gray-200/50 dark:prose-code:bg-gray-800/80 prose-code:text-purple-700 dark:prose-code:text-purple-300 prose-code:font-mono prose-code:text-[12px] prose-code:before:content-none prose-code:after:content-none
                  prose-pre:bg-[#1e1e24] prose-pre:text-gray-100 prose-pre:rounded-xl prose-pre:p-4 prose-pre:my-4 prose-pre:overflow-x-auto prose-pre:border prose-pre:border-gray-800
                  prose-ul:my-3 prose-ul:list-disc prose-ul:pl-5
                  prose-ol:my-3 prose-ol:list-decimal prose-ol:pl-5
                  prose-li:my-1.5 prose-li:marker:text-gray-400
                  prose-blockquote:border-l-4 prose-blockquote:border-purple-500/50 prose-blockquote:pl-4 prose-blockquote:py-0.5 prose-blockquote:my-4 prose-blockquote:italic prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400 prose-blockquote:bg-purple-50/30 dark:prose-blockquote:bg-purple-900/10 prose-blockquote:rounded-r-lg">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}

              {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50 space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block">
                    Cited Sources
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.sources.map((src: any, sIdx: number) => (
                      <a
                        key={src._id || sIdx}
                        href={src.link || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-gray-900 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-400 border border-gray-200 dark:border-gray-700 rounded-lg text-[10px] font-semibold transition-all shadow-sm max-w-full"
                      >
                        <span className="w-4 h-4 shrink-0 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center text-[9px] font-bold border border-purple-200/30">
                          {sIdx + 1}
                        </span>
                        <span className="truncate max-w-[130px]">{src.title || "Untitled"}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex items-center gap-2 p-3.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl w-20 shadow-sm animate-pulse">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="pt-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
        <form onSubmit={handleSendMessage} className="relative">
          <input
            value={chatQuery}
            onChange={(e) => setChatQuery(e.target.value)}
            disabled={isThinking}
            className="w-full pl-4 pr-12 py-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-[13px] text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-4 focus:ring-purple-600/5 dark:focus:ring-purple-900/30 focus:border-purple-500 dark:focus:border-purple-600 transition-all disabled:opacity-50"
            placeholder="Ask this memory..."
          />
          <button
            type="submit"
            disabled={!chatQuery.trim() || isThinking}
            className="absolute right-2 top-2 p-2 bg-purple-600 text-white rounded-xl shadow-md hover:bg-purple-700 transition-all active:scale-95 disabled:opacity-30"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Export: The Centered Focus Modal ────────────────────────────────────
export function AIInsightsPanel({ isOpen, onClose, selectedContent }: AIInsightsPanelProps) {
  const { data: connections = [] } = useQuery({
    queryKey: ["connections", selectedContent?._id],
    queryFn: async () => {
      if (!selectedContent) return [];
      return getConnections(selectedContent._id);
    },
    enabled: Boolean(selectedContent),
  });

  const sections = useMemo<OverviewSections>(() => {
    if (!selectedContent?.description)
      return { short: "", mainIdeas: [], takeaways: [], metadata: { readingTime: "1", difficulty: "Beginner" } };

    const text = selectedContent.description;
    let shortText = text;

    const mainIdeasIndex = text.indexOf("MAIN IDEAS:");
    const takeawaysIndex = text.indexOf("KEY TAKEAWAYS:");
    const metaIndex = text.indexOf("Reading Time:");

    const firstSectionIndex = Math.min(
      mainIdeasIndex !== -1 ? mainIdeasIndex : Infinity,
      takeawaysIndex !== -1 ? takeawaysIndex : Infinity,
      metaIndex !== -1 ? metaIndex : Infinity
    );

    if (firstSectionIndex !== Infinity) {
      shortText = text.slice(0, firstSectionIndex).trim();
    } else {
      shortText = text.trim();
    }

    let mainIdeasText = "";
    if (mainIdeasIndex !== -1) {
      const endIdx = Math.min(
        takeawaysIndex !== -1 && takeawaysIndex > mainIdeasIndex ? takeawaysIndex : Infinity,
        metaIndex !== -1 && metaIndex > mainIdeasIndex ? metaIndex : Infinity
      );
      mainIdeasText = text.slice(mainIdeasIndex + "MAIN IDEAS:".length, endIdx !== Infinity ? endIdx : undefined).trim();
    }

    let takeawaysText = "";
    if (takeawaysIndex !== -1) {
      const endIdx = metaIndex !== -1 && metaIndex > takeawaysIndex ? metaIndex : Infinity;
      takeawaysText = text.slice(takeawaysIndex + "KEY TAKEAWAYS:".length, endIdx !== Infinity ? endIdx : undefined).trim();
    }

    const parseBullets = (str: string) => {
      if (!str) return [];
      return str.split(/[•·\n]+/).map((s) => s.trim()).filter(Boolean);
    };

    const metaMatch = text.match(/Reading Time: (\d+) min \| Difficulty: (\w+)/);

    return {
      short: shortText || text,
      mainIdeas: parseBullets(mainIdeasText),
      takeaways: parseBullets(takeawaysText),
      metadata: {
        readingTime: metaMatch ? metaMatch[1] : "1",
        difficulty: metaMatch ? metaMatch[2] : "Beginner",
      },
    };
  }, [selectedContent]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // No body scroll lock — avoids layout shift from scrollbar removal

  const contentKey = selectedContent?._id ?? "empty";

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────────── */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-md transition-all duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* ── Modal Container ──────────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-all duration-300 ${
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      >
        <div
          className={`relative w-full max-w-5xl bg-white dark:bg-[#141418] rounded-3xl shadow-2xl shadow-black/30 dark:shadow-black/60 border border-gray-100/80 dark:border-[#252530] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
            isOpen
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 translate-y-4"
          }`}
          style={{ height: "min(88vh, 740px)" }}
          onClick={(e) => e.stopPropagation()}
        >

          {/* ── Modal Header ───────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100/80 dark:border-[#252530] bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shadow-[0_0_6px_rgba(168,85,247,0.5)]" />
                <span className="text-[11px] font-bold text-purple-400/80 uppercase tracking-[0.25em]">Neural Insight</span>
              </div>
              {selectedContent && (
                <>
                  <span className="text-gray-300 dark:text-gray-700">·</span>
                  <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[320px]">
                    {selectedContent.title}
                  </span>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 p-2 bg-gray-50/80 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all shrink-0"
              title="Close (Esc)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Esc</span>
            </button>
          </div>

          {/* ── Modal Body ─────────────────────────────────────────────────── */}
          {!selectedContent ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-[calc(100%-73px)] text-center px-8 gap-5 animate-in fade-in duration-500">
              <div className="w-16 h-16 bg-purple-50/50 dark:bg-purple-900/20 rounded-3xl flex items-center justify-center text-purple-300 dark:text-purple-500 border border-purple-100/30 dark:border-purple-800/30">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-[18px] font-bold text-gray-800 dark:text-gray-200 mb-2">Neural Workspace</h2>
                <p className="text-[13px] text-gray-400 dark:text-gray-500 font-medium leading-relaxed max-w-[280px]">
                  Select a memory card to synthesize deep insights or explore global patterns.
                </p>
              </div>
            </div>
          ) : (
            /* Two-Column Layout */
            <div
              key={contentKey}
              className="flex h-[calc(100%-73px)] divide-x divide-gray-100/80 dark:divide-[#252530] animate-in fade-in duration-400"
            >
              {/* Left: Summary, Takeaways, Connections */}
              <div className="flex-[55] min-w-0 p-6 overflow-hidden flex flex-col">
                <SummaryColumn
                  selectedContent={selectedContent}
                  connections={connections}
                  sections={sections}
                />
              </div>

              {/* Right: Ask AI Chat */}
              <div className="flex-[45] min-w-0 p-6 overflow-hidden bg-gray-50/30 dark:bg-gray-900/20 flex flex-col">
                <ChatColumn selectedContent={selectedContent} />
              </div>
            </div>
          )}

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-300/30 dark:via-purple-700/30 to-transparent" />
        </div>
      </div>
    </>
  );
}

export default AIInsightsPanel;
