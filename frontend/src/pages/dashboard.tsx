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


  /**
   * Manual Insight Generation (On-Demand)
   */
  async function handleGenerateInsight(contentId: string) {
  // Cancel previous if any
  if (abortControllerRef.current) abortControllerRef.current.abort();
  abortControllerRef.current = new AbortController();

  // 1. Optimistic UI Update using Query Cache
  await queryClient.cancelQueries({ queryKey: ["content"] });
  queryClient.setQueryData<Content[]>(["content"], (old) => 
    old ? old.map(c => c._id === contentId ? { ...c, aiStatus: "queued" } : c) : []
  );
  
  // 2. Open panel instantly
  setSelectedContentId(contentId);
  setIsAiPanelOpen(true);


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
      />
      
      {/* Main Content Area */}
      <main className="flex-1 ml-72 overflow-x-hidden min-h-screen bg-[#FDFDFD]">
        <CreateContentModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
        <ShareModal 
          open={shareModalOpen} 
          onClose={() => setShareModalOpen(false)} 
          onStatusChange={fetchShareStatus}
        />

        <div className="p-12 max-w-[1400px] mx-auto font-inter">
          {/* Header Section: High-Fidelity & Airy */}
          <header className="mb-16 sticky top-0 bg-[#FDFDFD]/40 backdrop-blur-2xl z-20 pt-8 pb-8 -mx-12 px-12 border-b border-gray-100/30">
            <div className="flex items-center justify-between gap-16">
              {/* Left: Elegant Title */}
              <div className="shrink-0">
                <h1 className="text-[30px] font-bold text-gray-900 tracking-tight mb-1 font-outfit">
                  {selectedFilter === "all"      && "Memory Stream"}
                  {selectedFilter === "post"     && "Articles"}
                  {selectedFilter === "video"    && "Videos"}
                  {selectedFilter === "document" && "Deep Files"}
                </h1>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.3em] ml-0.5">
                  {filteredContents.length} Neural {filteredContents.length === 1 ? "Node" : "Nodes"}
                </p>
              </div>

              {/* Center: Smart Semantic Search */}
              <div className="flex-1 max-w-xl relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition duration-1000 group-focus-within:duration-200"></div>
                <div className="relative flex items-center bg-white rounded-2xl border border-gray-100 shadow-sm shadow-purple-50/50 overflow-hidden transition-all group-focus-within:border-purple-200 group-focus-within:shadow-purple-100/50">
                  <div className="pl-6 text-gray-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your memories semantically..."
                    className="w-full py-5 px-5 text-[15px] text-gray-600 focus:outline-none placeholder:text-gray-300 font-medium bg-transparent"
                  />
                  {isSearching && (
                    <div className="pr-6">
                      <div className="w-4 h-4 border-2 border-purple-100 border-t-purple-500 rounded-full animate-spin"></div>
                    </div>
                  )}
                  {searchQuery && !isSearching && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-5 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-xl text-gray-300 transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
              </div>
            </div>

              {/* Right: Integrated Actions */}
              <div className="flex gap-3 shrink-0">
                <Button
                  variant="primary"
                  text="New Memory"
                  startIcon={<PlusIcon />}
                  onClick={() => setModalOpen(true)}
                />
                <button
                  onClick={() => setShareModalOpen(true)}
                  className="p-3.5 bg-white border border-gray-100 text-gray-400 rounded-xl shadow-sm hover:shadow-md hover:border-purple-200 hover:text-purple-600 transition-all active:scale-95"
                >
                  {shareConfig.icon}
                </button>
              </div>
            </div>
          </header>

          {/* Content Grid: Editorial Layout */}
          <div
            className="grid gap-10 pb-20"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}
          >
            {filteredContents.map(({ type, link, title, _id, aiStatus, description }) => (
              <Card
                key={_id}
                title={title}
                link={link}
                type={type}
                aiStatus={aiStatus}
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

          {/* Empty State: High-Fidelity Narrative */}
          {filteredContents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="w-20 h-20 bg-purple-50/50 rounded-[28px] flex items-center justify-center mb-10 border border-purple-100/30 shadow-sm relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-transparent"></div>
                <svg className="w-8 h-8 text-purple-300 animate-pulse-semantic" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>
              <h3 className="text-[22px] font-bold text-gray-800 mb-3 tracking-tight font-outfit">
                {searchQuery ? "No semantic clusters found" : "Your knowledge space is empty"}
              </h3>
              <p className="text-gray-400 text-[13px] max-w-[340px] mb-12 leading-relaxed font-medium">
                {searchQuery
                  ? `No relevant connections for "${searchQuery}" detected in your workspace.`
                  : "Feed your second brain with links, documents, or thoughts to begin intelligent synthesis."}
              </p>
              {!searchQuery && (
                <Button
                  variant="primary"
                  text="Initialize First Memory"
                  onClick={() => setModalOpen(true)}
                />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Persistent AI Insights Sidebar */}
      <AIInsightsPanel
        isOpen={isAiPanelOpen}
        onClose={() => setIsAiPanelOpen(false)}
        selectedContent={contents.find(c => c._id === selectedContentId)}
      />
    </div>
  );
}
