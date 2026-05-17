import { Logo } from "../icons/Logo";
import { SidebarItem } from "./SidebarItem";
import { useNavigate } from "react-router-dom";
import type { Content } from "../hooks/useContent";

export function Sidebar({
    selectedFilter,
    onFilterChange,
    contents = [],
    selectedContentId
}: {
    selectedFilter: string;
    onFilterChange: (filter: string) => void;
    contents?: Content[];
    selectedContentId?: string | null;
}) {
    const navigate = useNavigate();
    const username = localStorage.getItem("username") || "User";

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        navigate("/signin");
    };

    return (
        <div className="h-screen w-[280px] fixed left-0 top-0 bg-white flex flex-col z-30 border-r border-gray-100/50 font-inter">
            {/* Header: Minimal & Elegant */}
            <div className="p-8 pb-6">
                <div className="flex items-center gap-3 text-gray-900 tracking-tight">
                    <div className="text-purple-600 animate-pulse-semantic">
                        <Logo />
                    </div>
                    <span className="text-[17px] font-bold tracking-tight text-gray-900 font-outfit">Second Brain</span>
                </div>
            </div>

            {/* SECTION 1: ACTIVE MEMORY (Contextual Focal Point) */}
            <div className="px-5 mb-8">
                <div className="px-2 mb-3 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-gray-300 uppercase tracking-[0.25em]">Active Context</span>
                    <div className="flex gap-1">
                       <div className="w-1 h-1 rounded-full bg-purple-400 animate-pulse"></div>
                       <div className="w-1 h-1 rounded-full bg-purple-300 animate-pulse [animation-delay:0.2s]"></div>
                    </div>
                </div>
                
                {selectedContentId ? (
                    (() => {
                        const activeItem = contents.find(c => c._id === selectedContentId);
                        if (!activeItem) return null;
                        return (
                            <div className="p-4 rounded-[22px] bg-purple-50/50 border border-purple-100/40 shadow-[0_10px_25px_-10px_rgba(109,99,217,0.12)] animate-in fade-in zoom-in duration-500 group relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-tr from-purple-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-purple-100 shadow-sm">
                                        <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[12px] font-bold text-gray-800 truncate leading-none mb-1">{activeItem.title}</div>
                                        <div className="text-[9px] font-bold text-purple-400 uppercase tracking-tighter">{activeItem.aiMetadata?.domain || "Memory Node"}</div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1">
                                        <div className="w-1 h-1 rounded-full bg-green-400"></div>
                                        Synthesized
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-300">Just now</span>
                                </div>
                            </div>
                        );
                    })()
                ) : (
                    <div className="p-4 rounded-[22px] border border-dashed border-gray-100 bg-gray-50/30 flex flex-col items-center justify-center text-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-200 animate-pulse mb-2"></div>
                        <span className="text-[10px] font-medium text-gray-300">No active memory loaded</span>
                    </div>
                )}
            </div>

            {/* SECTION 2: INTELLIGENT NAVIGATION */}
            <div className="px-4 space-y-1">
                <SidebarItem
                    text="Knowledge Base"
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                    onClick={() => onFilterChange("all")}
                    active={selectedFilter === "all"}
                />
                <SidebarItem
                    text="Articles"
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
                    onClick={() => onFilterChange("post")}
                    active={selectedFilter === "post"}
                />
                <SidebarItem
                    text="Videos"
                    icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
                    onClick={() => onFilterChange("video")}
                    active={selectedFilter === "video"}
                />
            </div>

            {/* Intelligence Status: Simplified */}
            <div className="mt-auto px-6 mb-8">
                <div className="p-6 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Neural Sync 2.0</span>
                    </div>
                    <div className="text-[11px] text-gray-400 font-medium leading-relaxed">
                        Knowledge graph is healthy. Semantic search is active across your brain.
                    </div>
                </div>
            </div>

            {/* User Profile: Softer & Elegant */}
            <div className="p-6 border-t border-gray-50/50">
                <div className="flex items-center gap-3 p-2 group cursor-pointer">
                    <div className="w-9 h-9 rounded-xl bg-purple-100/50 text-purple-600 flex items-center justify-center font-bold text-sm transition-transform group-hover:scale-105 border border-purple-100/30">
                        {username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-gray-800 truncate">{username}</div>
                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Neural Sync 2.0</div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-gray-300 hover:text-red-400 transition-colors p-2 hover:bg-red-50 rounded-lg"
                        title="Logout"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
