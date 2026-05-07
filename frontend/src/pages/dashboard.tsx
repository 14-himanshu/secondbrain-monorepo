import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CreateContentModal } from "../components/CreateContentModal";
import { ShareModal } from "../components/ShareModal";
import { PlusIcon } from "../icons/PlusIcon";
import { Sidebar } from "../components/Sidebar";
import { useContent } from "../hooks/useContent";
import { useContentMutations } from "../hooks/useContentMutations";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { useNavigate } from "react-router-dom";
import { AIInsightsPanel } from "../components/AIInsightsPanel";
import { useQueryClient } from "@tanstack/react-query";
import type { Content } from "../hooks/useContent";

const AI_PANEL_STORAGE_KEY = "sb-ai-panel-open";

export function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<{ shareType: string; shareId: string | null }>({
    shareType: "private",
    shareId: null,
  });
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [semanticResults, setSemanticResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  
  /**
   * AI Panel State Management
   * Persistence: Syncs with localStorage.
   * Shortcut: Ctrl+I (or Cmd+I on Mac).
   */
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(() => {
    const saved = localStorage.getItem(AI_PANEL_STORAGE_KEY);
    return saved !== null ? JSON.parse(saved) : true;
  });

  const { contents, refresh } = useContent();
  const { deleteContent, editContent } = useContentMutations();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const prevModalOpen = useRef(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Right Sidebar (Ctrl+I)
      if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        e.preventDefault();
        setIsAiPanelOpen((prev: boolean) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sync state to storage
  useEffect(() => {
    localStorage.setItem(AI_PANEL_STORAGE_KEY, JSON.stringify(isAiPanelOpen));
  }, [isAiPanelOpen]);

  // Handle sidebar closure / selection change (Abort current request)
  useEffect(() => {
    if (!isAiPanelOpen || !selectedContentId) {
       if (abortControllerRef.current) {
          console.log("[AI][ABORT] Sidebar closed or selection cleared.");
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
       }
    }
  }, [isAiPanelOpen, selectedContentId]);

  // ON-DEMAND POLLING: Only poll for the SELECTED content if it's processing
  useEffect(() => {
    const selected = contents.find(c => c._id === selectedContentId);
    const isProcessing = selected?.aiStatus && ["queued", "processing", "summarized"].includes(selected.aiStatus);

    if (isProcessing) {
      const interval = setInterval(() => {
        refresh();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedContentId, contents, refresh]);

  // Refresh only when modal transitions from open → closed
  useEffect(() => {
    if (prevModalOpen.current === true && modalOpen === false) {
      refresh();
    }
    prevModalOpen.current = modalOpen;
  }, [modalOpen, refresh]);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/signup");
    }
    fetchShareStatus();
  }, []);

  // Semantic Search Logic with Debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 2) {
        performSemanticSearch(searchQuery);
      } else {
        setSemanticResults(null);
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  async function performSemanticSearch(query: string) {
    setIsSearching(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/v1/search`, {
        params: { q: query },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setSemanticResults(response.data.results);
    } catch (e) {
      console.error("Semantic search failed", e);
      setSemanticResults([]); 
    } finally {
      setIsSearching(false);
    }
  }

  async function fetchShareStatus() {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/brain/share-status`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setShareStatus(response.data);
    } catch (e) {
      console.error("Failed to fetch share status", e);
    }
  }

  const [isSlowAnalysis, setIsSlowAnalysis] = useState(false);

  /**
   * Manual Insight Generation (On-Demand)
   */
  async function handleGenerateInsight(contentId: string) {
  // Cancel previous if any
  if (abortControllerRef.current) abortControllerRef.current.abort();
  abortControllerRef.current = new AbortController();
  setIsSlowAnalysis(false);

  // 1. Optimistic UI Update using Query Cache
  await queryClient.cancelQueries({ queryKey: ["content"] });
  queryClient.setQueryData<Content[]>(["content"], (old) => 
    old ? old.map(c => c._id === contentId ? { ...c, aiStatus: "queued" } : c) : []
  );
  
  // 2. Open panel instantly
  setSelectedContentId(contentId);
  setIsAiPanelOpen(true);

  // Timeout handler for long-running analysis
  const slowTimer = setTimeout(() => {
    setIsSlowAnalysis(true);
  }, 10000);

  try {
    const response = await axios.post(`${BACKEND_URL}/api/v1/ai/reprocess`, 
      { contentId },
      { 
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        signal: abortControllerRef.current.signal
      }
    );
    
    // Quick Mode Hydration: If the API returned quick data, update cache instantly
    if (response.data.data) {
      const quick = response.data.data;
      queryClient.setQueryData<Content[]>(["content"], (old) => 
        old ? old.map(c => c._id === contentId ? { 
          ...c, 
          title: quick.title || c.title,
          description: quick.description,
          tags: quick.tags,
          aiStatus: "processing" 
        } : c) : []
      );
    }
    
    console.log("Insight generation started", response.data.message);
  } catch (error: any) {
    if (axios.isCancel(error)) return;
    
    const diagnostic = "Failed to start insight generation";
    console.error(`[INSIGHT_START_ERROR]`, error);
    
    // Revert status on failure
    queryClient.setQueryData<Content[]>(["content"], (old) => 
      old ? old.map(c => c._id === contentId ? { ...c, aiStatus: "failed", aiError: diagnostic } : c) : []
    );
  } finally {
    clearTimeout(slowTimer);
    queryClient.invalidateQueries({ queryKey: ["content"] });
  }
}

  let displayContents = contents;
  
  if (semanticResults !== null) {
    displayContents = semanticResults;
  } else if (searchQuery) {
    displayContents = contents.filter((content) =>
      content.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.link?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  const filteredContents =
    selectedFilter === "all"
      ? displayContents
      : displayContents.filter(
        (content) => content.type?.toLowerCase() === selectedFilter
      );

  const getShareButtonConfig = () => {
    switch (shareStatus.shareType) {
      case "link":
        return {
          text: "Link Shared",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
          )
        };
      case "public":
        return {
          text: "Public",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9s2.015-9 4.5-9m0 0a9.004 9.004 0 0 1 8.716 6.747M12 3a9.004 9.004 0 0 0-8.716 6.747" />
            </svg>
          )
        };
      default:
        return {
          text: "Private",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          )
        };
    }
  };

  const shareConfig = getShareButtonConfig();

  return (
    <div className="flex bg-gray-100 min-h-screen relative overflow-hidden">
      <Sidebar
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
        contents={contents}
        selectedContentId={selectedContentId}
        onSelectInsight={(id) => {
          setSelectedContentId(id);
          setIsAiPanelOpen(true);
        }}
      />
      
      {/* Main Content Area */}
      <main className="flex-1 ml-72 overflow-x-hidden min-h-screen">
        <CreateContentModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
        <ShareModal 
          open={shareModalOpen} 
          onClose={() => setShareModalOpen(false)} 
          onStatusChange={fetchShareStatus}
        />

        <div className="p-8">
          {/* Header Section */}
          <header className="mb-8 sticky top-0 bg-gray-100/95 backdrop-blur-sm z-10 py-4 -mx-8 px-8 border-b border-gray-200/50">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Title & Count */}
              <div className="shrink-0 min-w-[200px]">
                <h1 className="text-3xl font-bold text-black tracking-tight">
                {selectedFilter === "all"      && "All Notes"}
                  {selectedFilter === "post"     && "Posts"}
                  {selectedFilter === "video"    && "Videos"}
                  {selectedFilter === "document" && "Documents"}
                </h1>
                <p className="text-gray-600 text-sm font-medium mt-1">
                  {filteredContents.length}{" "}
                  {filteredContents.length === 1 ? "item" : "items"}
                </p>
              </div>

              {/* Center: Search Bar */}
              <div className="flex-1 max-w-xl mx-4">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {isSearching ? (
                      <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="size-5 text-gray-400 group-focus-within:text-purple-600 transition-colors"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                        />
                      </svg>
                    )}
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search semantically..."
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all shadow-sm hover:shadow-md hover:border-gray-300"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex gap-3 shrink-0">
                <Button
                  onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                  variant="secondary"
                  text={isAiPanelOpen ? "Hide AI" : "AI Insights"}
                  startIcon={<span className="text-sm">💡</span>}
                  aria-label="Toggle AI Insights Panel"
                />
                <Button
                  onClick={() => setShareModalOpen(true)}
                  variant="secondary"
                  text={shareConfig.text}
                  startIcon={shareConfig.icon}
                />
                <Button
                  onClick={() => setModalOpen(true)}
                  variant="primary"
                  text="Add Content"
                  startIcon={<PlusIcon />}
                />
              </div>
            </div>
          </header>

          {/* Content Grid */}
          <div
            className="grid gap-6"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
          >
            {filteredContents.map(({ type, link, title, _id, embeddingStatus, aiStatus, aiMetadata, description }) => (
              <Card
                key={_id}
                title={title}
                link={link}
                type={type}
                status={embeddingStatus}
                aiStatus={aiStatus}
                aiMetadata={aiMetadata}
                description={description}
                isSelected={selectedContentId === _id}
                onGenerateInsight={() => handleGenerateInsight(_id)}
                onSelect={() => {
                  setSelectedContentId(prev => prev === _id ? null : _id);
                  setIsAiPanelOpen(true);
                }}
                onEdit={(newTitle) => editContent({ contentId: _id, title: newTitle })}
                onDelete={() => deleteContent(_id)}
              />
            ))}
          </div>

          {/* Empty State */}
          {filteredContents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor" className="size-10 text-gray-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-black mb-2">
                {searchQuery ? "No conceptual matches" : "No content yet"}
              </h3>
              <p className="text-gray-500 max-w-sm mb-8 leading-relaxed">
                {searchQuery
                  ? `Our AI couldn't find anything related to "${searchQuery}" in your current notes.`
                  : "Start building your second brain by adding your first piece of content."}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setModalOpen(true)}
                  variant="primary"
                  text="Add Your First Content"
                  startIcon={<PlusIcon />}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Toggle - Unified Styling */}
      <button
        onClick={() => setIsAiPanelOpen(true)}
        aria-label="Open AI Insights"
        className={`fixed bottom-8 right-8 w-14 h-14 bg-white border border-gray-200 text-black rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all z-30 flex items-center justify-center text-2xl group ${
          isAiPanelOpen ? "opacity-0 pointer-events-none translate-y-10" : "opacity-100 translate-y-0"
        }`}
      >
        💡
        <span className="absolute right-full mr-4 px-3 py-1.5 bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
          Insights
        </span>
      </button>

      {/* Persistent AI Insights Sidebar */}
      <AIInsightsPanel
        isOpen={isAiPanelOpen}
        onClose={() => setIsAiPanelOpen(false)}
        contentCount={contents.length}
        selectedContent={contents.find(c => c._id === selectedContentId)}
        onClearSelection={() => setSelectedContentId(null)}
        onRetry={handleGenerateInsight}
        isSlowAnalysis={isSlowAnalysis}
      />
    </div>
  );
}
