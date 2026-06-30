import { Card } from "../components/Card";
import { CreateContentModal } from "../components/CreateContentModal";
import { UpgradeModal } from "../components/UpgradeModal";
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

const AI_PANEL_STORAGE_KEY = "sb-ai-panel-open";

type DashboardLocationState = { openId?: string; filter?: string; triggerExtract?: boolean };

export function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as DashboardLocationState | null;
  const openIdFromState = locationState?.openId ?? null;

  const [modalOpen, setModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<{ shareType: ShareType; shareId: string | null }>({
    shareType: "private",
    shareId: null,
  });
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [semanticResults, setSemanticResults] = useState<Content[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(() => openIdFromState);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("sb-sidebar-collapsed") === "true"
  );
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
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
    const isProcessing = selected?.aiStatus && ["queued", "processing", "scraping", "analyzing"].includes(selected.aiStatus);

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
    if (openIdFromState || locationState?.filter) {
      if (locationState?.filter) {
        setTimeout(() => setSelectedFilter(locationState!.filter!), 0);
      }
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [openIdFromState, locationState, navigate, location.pathname]);



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

    if (isApiError(error) && (error.details as Record<string, unknown>)?.code === "QUOTA_EXCEEDED") {
      setUpgradeModalOpen(true);
      // Revert optimistic UI
      queryClient.setQueryData<Content[]>(queryKeys.content, (old) => 
        old ? old.map(c => c._id === contentId ? { ...c, aiStatus: "unprocessed" } : c) : []
      );
      return;
    }

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

  useEffect(() => {
    if (locationState?.triggerExtract && openIdFromState) {
      setTimeout(() => handleGenerateInsight(openIdFromState), 0);
      // Clear trigger flag so it doesn't re-run on subsequent renders
      navigate(".", { replace: true, state: { openId: openIdFromState } });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationState, openIdFromState]);

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
    <div className="flex bg-muted dark:bg-[#0d0d0f] min-h-screen">
      <Sidebar
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
        contents={contents}
        selectedContentId={selectedContentId}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectContent={(id) => { setSelectedContentId(id); setIsAiPanelOpen(true); }}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Main Content Area */}
      <main className={`flex-1 overflow-x-hidden min-h-screen bg-background dark:bg-[#0d0d0f] transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}`}>
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
        <UpgradeModal
          open={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
        />

        {/* ── Header ── */}
        <header className="sticky top-0 z-20 bg-card/80 dark:bg-[#0d0d0f]/80 backdrop-blur-lg px-4 md:px-6 pt-4 md:pt-6 pb-4 border-b border-border dark:border-[#252530]/80 font-inter">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3 md:gap-6">
              
              {/* Left: Title & Hamburger */}
              {!mobileSearchOpen && (
                <div className="flex items-center gap-3 shrink-0 min-w-[120px] md:min-w-[160px]">
                  <button
                    className="lg:hidden w-11 h-11 flex items-center justify-center rounded-xl bg-muted border border-border text-foreground/70 active:scale-95 transition-all"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="Open navigation"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                  </button>
                  <div>
                    <h1 className="text-[20px] md:text-[26px] font-bold text-slate-900 dark:text-white tracking-tight leading-none font-outfit">
                      {selectedFilter === "all"      && "All Items"}
                      {selectedFilter === "post"     && "Posts"}
                      {selectedFilter === "video"    && "Videos"}
                      {selectedFilter === "document" && "Documents"}
                    </h1>
                    <p className="text-[11px] md:text-[12px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.15em] mt-1.5 md:mt-2">
                      {filteredContents.length} {filteredContents.length === 1 ? "item" : "items"}
                    </p>
                  </div>
                </div>
              )}

              {/* Center: Search */}
              <div className={`flex-1 max-w-[600px] w-full ${mobileSearchOpen ? 'flex' : 'hidden md:flex'}`}>
                <div className="relative flex items-center w-full bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border border-gray-200/60 dark:border-gray-800/60 focus-within:bg-white dark:focus-within:bg-gray-900 focus-within:border-purple-200 dark:focus-within:border-purple-800 focus-within:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 h-11">
                  <div className="pl-3.5 text-gray-400 flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full py-2 px-3 text-[14px] text-slate-900 dark:text-slate-200 focus:outline-none placeholder:text-slate-400 font-medium bg-transparent"
                    autoFocus={mobileSearchOpen}
                  />
                  {isSearching && (
                    <div className="pr-3.5">
                      <div className="w-4 h-4 border-2 border-purple-100 border-t-purple-500 rounded-full animate-spin" />
                    </div>
                  )}
                  {(searchQuery || mobileSearchOpen) && !isSearching && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        if (mobileSearchOpen && !searchQuery) setMobileSearchOpen(false);
                      }}
                      className="pr-3.5 pl-2 text-gray-400 hover:text-gray-600 transition-colors w-10 h-10 flex items-center justify-center"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Right: Actions */}
              {!mobileSearchOpen && (
                <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-auto md:ml-0">
                  {/* Mobile Search Toggle */}
                  <button
                    onClick={() => setMobileSearchOpen(true)}
                    className="md:hidden w-11 h-11 flex items-center justify-center rounded-xl bg-gray-50/50 dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-800/60 text-gray-500 hover:text-gray-700 dark:text-gray-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </button>

                  {/* Share button */}
                  <button
                    onClick={() => setShareModalOpen(true)}
                    className="w-11 h-11 flex items-center justify-center rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900 text-slate-500 dark:text-slate-400 hover:text-[#6f63d9] dark:hover:text-[#8378e8] hover:border-purple-200 dark:hover:border-purple-800 hover:shadow-sm transition-all duration-200 active:scale-95"
                    title="Share brain"
                  >
                    <div className="scale-110">{shareConfig.icon}</div>
                  </button>

                  {/* Ask AI */}
                  <button
                    onClick={() => setIsAiPanelOpen((prev) => !prev)}
                    className="w-11 h-11 md:w-auto md:h-11 flex items-center justify-center gap-2 px-0 md:px-4 rounded-xl border border-purple-200 bg-purple-50 text-[#6f63d9] hover:bg-purple-100 hover:border-purple-300 shadow-sm transition-all duration-200 active:scale-95"
                    title="Toggle Neural Workspace (Cmd/Ctrl+I)"
                  >
                    <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <span className="hidden md:inline text-[14px] font-bold tracking-tight">Ask AI</span>
                  </button>

                  {/* New Memory */}
                  <button
                    onClick={() => setModalOpen(true)}
                    className="w-11 h-11 md:w-auto md:h-11 flex items-center justify-center gap-2 px-0 md:px-4 rounded-xl bg-[#6f63d9] text-white hover:bg-[#5b50b5] shadow-sm hover:shadow transition-all duration-200 active:scale-95"
                  >
                    <div className="scale-110 md:scale-100"><PlusIcon /></div>
                    <span className="hidden md:inline text-[14px] font-bold tracking-tight">Add New</span>
                  </button>
                </div>
              )}
            </div>
        </header>

        <div className="px-6 pt-8 pb-8 max-w-[1400px] mx-auto font-inter">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20 items-start">
            {filteredContents.map(({ type, link, title, _id, aiStatus, description, aiMetadata }) => (
              <div
                key={_id}
                ref={el => { cardRefs.current[_id] = el; }}
              >
              <Card
                key={_id}
                title={title}
                link={link}
                type={type}
                aiStatus={aiStatus}
                aiMetadata={aiMetadata}
                description={description}
                isSelected={selectedContentId === _id}
                onGenerateInsight={() => handleGenerateInsight(_id)}
                onSelect={() => {
                  const isDeselecting = selectedContentId === _id;
                  setSelectedContentId(isDeselecting ? null : _id);
                  if (!isDeselecting) {
                    setIsAiPanelOpen(true);
                  } else {
                    setIsAiPanelOpen(false);
                  }
                }}
                onEdit={(newTitle) => editContent({ contentId: _id, title: newTitle })}
                onDelete={() => deleteContent(_id)}
              />
              </div>
            ))}
          </div>

          {/* Empty State: High-Fidelity Narrative */}
          {filteredContents.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-20 pb-32 text-center animate-page-enter">
              {/* Branded icon with glow */}
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-purple-500/20 rounded-[32px] blur-2xl scale-150 pointer-events-none" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-purple-500/10 to-purple-700/10 dark:from-purple-500/20 dark:to-purple-700/20 rounded-[28px] flex items-center justify-center border border-purple-200/50 dark:border-purple-500/30 shadow-sm">
                  <svg className="w-9 h-9 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 3.75H6.912a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859M12 3v8.25m0 0-3-3m3 3 3-3" />
                  </svg>
                </div>
              </div>

              <h3 className="text-xl font-bold text-foreground mb-2 tracking-tight">
                {searchQuery ? "No results found" : "Your vault is empty. Let's fill it."}
              </h3>
              <p className="text-sm text-muted-foreground max-w-[300px] mb-8 leading-relaxed">
                {searchQuery
                  ? `No items match "${searchQuery}". Try a different search term.`
                  : "Save links, articles, YouTube videos, or documents and let AI summarize them for you."}
              </p>

              {!searchQuery && (
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={() => setModalOpen(true)}
                    className="h-10 px-5 rounded-xl font-bold text-sm text-white
                      bg-gradient-to-b from-purple-500 to-[#6f63d9]
                      shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,_0_4px_14px_rgba(111,99,217,0.4)]
                      hover:shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,_0_6px_20px_rgba(111,99,217,0.55)]
                      hover:-translate-y-0.5 active:translate-y-0
                      transition-all duration-200"
                  >
                    Add your first link
                  </button>
                  <a
                    href="https://chromewebstore.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 px-5 rounded-xl font-semibold text-sm border border-border hover:border-primary/40 hover:bg-muted/50 text-foreground transition-all duration-150"
                  >
                    Get Chrome Extension
                  </a>
                </div>
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
