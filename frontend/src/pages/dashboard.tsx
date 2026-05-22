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

type DashboardLocationState = { openId?: string; filter?: string };

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("sb-sidebar-collapsed") === "true"
  );
  const [driveDropdownOpen, setDriveDropdownOpen] = useState(false);
  
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
    if (openIdFromState || locationState?.filter) {
      if (locationState?.filter) {
        setSelectedFilter(locationState.filter);
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
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Main Content Area */}
      <main className={`flex-1 overflow-x-hidden min-h-screen bg-[#FDFDFD] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}`}>
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

        <div className="px-6 pt-6 pb-8 max-w-[1400px] mx-auto font-inter">
          {/* ── Header ── */}
          <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md pt-4 pb-3 mb-8 border-b border-gray-100/60">
            <div className="flex items-center justify-between gap-6">
              
              {/* Left: Title */}
              <div className="shrink-0 min-w-[160px]">
                <h1 className="text-[26px] font-bold text-gray-900 tracking-tight leading-none font-outfit">
                  {selectedFilter === "all"      && "Memory Stream"}
                  {selectedFilter === "post"     && "Articles"}
                  {selectedFilter === "video"    && "Videos"}
                  {selectedFilter === "document" && "Deep Files"}
                </h1>
                <p className="text-[12px] text-gray-400 font-bold uppercase tracking-[0.15em] mt-2">
                  {filteredContents.length} {filteredContents.length === 1 ? "node" : "nodes"}
                </p>
              </div>

              {/* Center: Search */}
              <div className="flex-1 max-w-[420px]">
                <div className="relative flex items-center bg-gray-50/50 rounded-xl border border-gray-200/60 focus-within:bg-white focus-within:border-purple-200 focus-within:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 h-10">
                  <div className="pl-3.5 text-gray-400 flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search memories..."
                    className="w-full py-2 px-3 text-[14px] text-gray-700 focus:outline-none placeholder:text-gray-400 font-medium bg-transparent"
                  />
                  {isSearching && (
                    <div className="pr-3.5">
                      <div className="w-4 h-4 border-2 border-purple-100 border-t-purple-500 rounded-full animate-spin" />
                    </div>
                  )}
                  {searchQuery && !isSearching && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="pr-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Share button */}
                <button
                  onClick={() => setShareModalOpen(true)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200/60 bg-white text-gray-500 hover:text-purple-600 hover:border-purple-200 hover:shadow-sm transition-all duration-200 active:scale-95"
                  title="Share brain"
                >
                  <div className="scale-110">{shareConfig.icon}</div>
                </button>

                {/* Drive status pill */}
                <div className="relative flex">
                  {google.normalized.state === 'connected' ? (
                    <>
                      <button
                        onClick={() => setDriveDropdownOpen(v => !v)}
                        className="h-10 flex items-center gap-2 px-3 rounded-xl border border-gray-200/60 bg-white hover:border-purple-200 hover:shadow-sm transition-all duration-200 active:scale-95"
                      >
                        {/* Google Drive icon */}
                        <svg viewBox="0 0 87.3 78" className="w-4 h-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                          <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                        </svg>
                        <span className="text-[13px] font-bold text-gray-700">Drive</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 ml-0.5" />
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${driveDropdownOpen ? 'rotate-180' : ''}`}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>

                      {/* Drive dropdown */}
                      {driveDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] z-50 overflow-hidden">
                          <div className="px-4 py-3 border-b border-gray-50">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              <span className="text-[12px] font-bold text-gray-800 tracking-tight">Drive Connected</span>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">Google Drive sync active</p>
                          </div>
                          <div className="p-1.5">
                            <button
                              onClick={async () => {
                                setDriveDropdownOpen(false);
                                const ok = window.confirm('Disconnect Google? This will stop Drive/Docs ingestion.');
                                if (!ok) return;
                                setGoogleActionError(null);
                                setGoogleActionLoading(true);
                                try { await google.disconnect(); await google.refresh(); }
                                catch { setGoogleActionError('Failed to disconnect Google.'); }
                                finally { setGoogleActionLoading(false); }
                              }}
                              disabled={googleActionLoading}
                              className="w-full text-left px-3 py-2 text-[12px] font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {googleActionLoading ? 'Disconnecting...' : 'Disconnect account'}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={async () => {
                        setGoogleActionError(null);
                        setGoogleActionLoading(true);
                        try { const url = await google.connect(); if (url) window.location.href = url; }
                        catch { setGoogleActionError('Failed to start Google connect.'); }
                        finally { setGoogleActionLoading(false); }
                      }}
                      disabled={googleActionLoading}
                      className="h-10 flex items-center gap-2 px-3 rounded-xl border border-gray-200/60 bg-white text-gray-600 hover:border-purple-200 hover:text-purple-700 hover:shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                      </svg>
                      <span className="text-[13px] font-bold">
                        {googleActionLoading ? 'Connecting...' : 'Connect Drive'}
                      </span>
                    </button>
                  )}
                  {googleActionError && (
                    <p className="absolute top-full right-0 mt-1.5 text-[11px] text-red-500 whitespace-nowrap">{googleActionError}</p>
                  )}
                </div>

                {/* New Memory */}
                <button
                  onClick={() => setModalOpen(true)}
                  className="h-10 flex items-center justify-center gap-2 px-4 rounded-xl bg-purple-600 text-white hover:bg-purple-700 shadow-sm hover:shadow transition-all duration-200 active:scale-95"
                >
                  <div className="scale-100"><PlusIcon /></div>
                  <span className="text-[14px] font-bold tracking-tight">New Memory</span>
                </button>
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
            <div className="flex flex-col items-center justify-center pt-24 pb-40 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
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
