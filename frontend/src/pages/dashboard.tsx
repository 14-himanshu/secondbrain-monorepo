import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CreateContentModal } from "../components/CreateContentModal";
import { ShareModal } from "../components/ShareModal";
import { PlusIcon } from "../icons/PlusIcon";
import { Sidebar } from "../components/Sidebar";
import { useContent } from "../hooks/useContent";
import { useContentMutations } from "../hooks/useContentMutations";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AIInsightsPanel } from "../components/AIInsightsPanel";

import { useQueryClient } from "@tanstack/react-query";
import type { Content } from "../hooks/useContent";
import type { ShareType } from "@secondbrain/contracts";
import { semanticSearch } from "../services/content.api";
import { getShareStatus } from "../services/share.api";
import { aiService } from "../services/ai.service";

import { queryKeys } from "../lib/queryKeys";
import { isApiError } from "../lib/apiClient";
import { useIntegration } from "../hooks/useIntegrations";

const AI_PANEL_STORAGE_KEY = "sb-ai-panel-open";

type DashboardLocationState = { openId?: string };

export function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as DashboardLocationState | null;
  const openIdFromState = locationState?.openId ?? null;

  const [modalOpen, setModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<{ shareType: ShareType; shareId: string | null }>({
    shareType: "private",
    shareId: null,
  });
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [semanticResults, setSemanticResults] = useState<Content[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(() => openIdFromState);
  const google = useIntegration("google");
  const [googleActionLoading, setGoogleActionLoading] = useState(false);
  const [googleActionError, setGoogleActionError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  /**
   * AI Panel State Management
   * Persistence: Syncs with localStorage.
   * Shortcut: Ctrl+I (or Cmd+I on Mac).
   */
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(() => {
    const saved = localStorage.getItem(AI_PANEL_STORAGE_KEY);
    if (openIdFromState) return true;
    return saved !== null ? JSON.parse(saved) : true;
  });

  const { contents, refresh } = useContent();
  const { deleteContent, editContent } = useContentMutations();
  const queryClient = useQueryClient();
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

    // fetch user profile for auth-provider hints
    (async () => {
      try {
        await import('../services/user.api').then(m => m.getMe());
        /* preserve backend check for google login provider; not showing inline hint currently */
      } catch {
        // ignore - user might not be logged in yet
      }
    })();
  }, [navigate, location]);

  useEffect(() => {
    if (openIdFromState) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [openIdFromState, navigate, location.pathname]);



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
      const results = await semanticSearch(query);
      setSemanticResults(results as Content[]);
    } catch (e) {
      console.error("Semantic search failed", e);
      setSemanticResults([]); 
    } finally {
      setIsSearching(false);
    }
  }

  async function fetchShareStatus() {
    try {
      const status = await getShareStatus();
      setShareStatus(status);
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
  await queryClient.cancelQueries({ queryKey: queryKeys.content });
  queryClient.setQueryData<Content[]>(queryKeys.content, (old) => 
    old ? old.map(c => c._id === contentId ? { ...c, aiStatus: "queued" } : c) : []
  );
  
  // 2. Open panel instantly
  setSelectedContentId(contentId);
  setIsAiPanelOpen(true);


  try {
    const response = await aiService.reprocessNote(contentId);
    
    // Quick Mode Hydration: If the API returned quick data, update cache instantly
    if (response.data.data) {
      const quick = response.data.data;
      queryClient.setQueryData<Content[]>(queryKeys.content, (old) => 
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
  } catch (error) {
    if (isApiError(error) && error.code === "ERR_CANCELED") return;

    const diagnostic = "Failed to start insight generation";
    console.error(`[INSIGHT_START_ERROR]`, error);
    
    // Revert status on failure
    queryClient.setQueryData<Content[]>(queryKeys.content, (old) => 
      old ? old.map(c => c._id === contentId ? { ...c, aiStatus: "failed", aiError: diagnostic } : c) : []
    );
  } finally {
    queryClient.invalidateQueries({ queryKey: queryKeys.content });
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
      {/* Mobile open sidebar button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-md bg-white border border-gray-100 shadow-sm"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open navigation"
      >
        <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>

      <Sidebar
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
        contents={contents}
        selectedContentId={selectedContentId}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectContent={(id) => { setSelectedContentId(id); setIsAiPanelOpen(true); }}
      />
      
      {/* Main Content Area */}
      <main className="flex-1 lg:ml-72 overflow-x-hidden min-h-screen bg-[#FDFDFD]">
        <CreateContentModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
        <ShareModal 
          key={`${shareStatus.shareType}:${shareStatus.shareId ?? "none"}`}
          open={shareModalOpen} 
          onClose={() => setShareModalOpen(false)} 
          onStatusChange={fetchShareStatus}
          shareStatus={shareStatus}
        />

        <div className="p-8 max-w-[1400px] mx-auto font-inter">
          {/* Header Section: Restored hierarchy */}
          <header className="mb-12 sticky top-0 bg-white/60 z-20 py-4 px-0 backdrop-blur-sm border-b border-gray-50/30">
            <div className="flex items-center justify-between gap-6">
              {/* Left: Elegant Title */}
              <div className="shrink-0">
                <h1 className="text-[26px] font-semibold text-gray-800 tracking-tight mb-1 font-outfit">
                  {selectedFilter === "all"      && "Memory Stream"}
                  {selectedFilter === "post"     && "Articles"}
                  {selectedFilter === "video"    && "Videos"}
                  {selectedFilter === "document" && "Deep Files"}
                </h1>
                <p className="text-gray-400 text-[10px] font-medium uppercase tracking-[0.25em] ml-0.5">
                  {filteredContents.length} Neural {filteredContents.length === 1 ? "Node" : "Nodes"}
                </p>
              </div>

              {/* Center + Actions Toolbar */}
              <div className="flex-1 flex items-center gap-4">
                <div className="flex-1 max-w-xl relative">
                  <div className="relative flex items-center bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden transition-all">
                    <div className="pl-4 text-gray-300">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search your memories..."
                      className="w-full py-3 px-4 text-[14px] text-gray-600 focus:outline-none placeholder:text-gray-300 font-medium bg-transparent"
                    />
                    {isSearching && (
                      <div className="pr-4">
                        <div className="w-4 h-4 border-2 border-purple-100 border-t-purple-500 rounded-full animate-spin"></div>
                      </div>
                    )}
                    {searchQuery && !isSearching && (
                      <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-xl text-gray-300 transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="primary"
                    text="New Memory"
                    startIcon={<PlusIcon />}
                    onClick={() => setModalOpen(true)}
                  />

                  {google.normalized.state === 'connected' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          const ok = window.confirm('Disconnect Google? This will stop Drive/Docs ingestion.');
                          if (!ok) return;
                          setGoogleActionError(null);
                          setGoogleActionLoading(true);
                          try {
                            await google.disconnect();
                            await google.refresh();
                          } catch (err) {
                            console.error('Disconnect failed', err);
                            setGoogleActionError('Failed to disconnect Google.');
                          } finally {
                            setGoogleActionLoading(false);
                          }
                        }}
                        className={`px-2.5 py-2 bg-white border border-gray-100 text-gray-700 rounded-lg transition-all active:scale-95 ${googleActionLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}`}
                        disabled={googleActionLoading}
                      >
                        {googleActionLoading ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                      <span className="text-sm text-gray-500">Drive connected</span>
                    </div>
                  ) : (
                    <button
                      onClick={async () => {
                        setGoogleActionError(null);
                        setGoogleActionLoading(true);
                        try {
                          const url = await google.connect();
                          if (url) window.location.href = url;
                        } catch (err) {
                          console.error('Failed to start Google connect', err);
                          setGoogleActionError('Failed to start Google connect.');
                        } finally {
                          setGoogleActionLoading(false);
                        }
                      }}
                      className={`px-3 py-2 bg-white border border-gray-100 text-gray-600 rounded-lg transition-all active:scale-95 ${googleActionLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm hover:border-purple-200 hover:text-purple-600'}`}
                      disabled={googleActionLoading}
                    >
                      {googleActionLoading ? 'Connecting...' : 'Enable Drive'}
                    </button>
                  )}

                  {googleActionError && <div className="text-red-600 text-sm ml-3">{googleActionError}</div>}

                  <button
                    onClick={() => setShareModalOpen(true)}
                    className="p-2 bg-white border border-gray-100 text-gray-400 rounded-lg hover:shadow-md hover:border-purple-200 hover:text-purple-600 transition-all"
                  >
                    {shareConfig.icon}
                  </button>
                </div>
              </div>
            </div>
          </header>


          <div
            className="grid gap-6 pb-20"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}
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
