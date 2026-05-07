import { Logo } from "../icons/Logo";
import { SidebarItem } from "./SidebarItem";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";

interface InsightItem {
  id: string;
  title: string;
  noteName: string;
  summary: string;
  label: string;
  contentId?: string;
}

export function Sidebar({
    selectedFilter,
    onFilterChange,
    contents = [],
    selectedContentId,
    onSelectInsight
}: {
    selectedFilter: string;
    onFilterChange: (filter: string) => void;
    contents?: any[];
    selectedContentId?: string | null;
    onSelectInsight?: (id: string) => void;
}) {
    const navigate = useNavigate();
    const username = localStorage.getItem("username") || "User";

    const insights: InsightItem[] = useMemo(() => {
        if (contents.length === 0) return [];
        const items: InsightItem[] = [];

        // Global Pattern
        const videoCount = contents.filter(c => c.type === 'video').length;
        if (videoCount > 0) {
            items.push({
                id: 'pattern-video',
                title: "Video-heavy learning",
                noteName: "Multiple Sources",
                summary: "You are consuming a high volume of video content lately.",
                label: "Learning Pattern",
            });
        }

        // Note-based patterns
        contents.slice(0, 3).forEach(content => {
            if (content.topics && content.topics.length > 0) {
                items.push({
                    id: `insight-${content._id}`,
                    title: `Focus: ${content.topics[0]}`,
                    noteName: content.title || "Untitled",
                    summary: content.description || "",
                    label: "Note Context",
                    contentId: content._id
                });
            }
        });

        if (contents.length >= 2) {
            items.push({
                id: 'connection-1',
                title: "Semantic overlap found",
                noteName: "Multiple Notes",
                summary: "Overlap detected in AI topics.",
                label: "Suggested Connection",
                contentId: contents[0]._id
            });
        }

        return items;
    }, [contents]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        navigate("/signin");
    };

    return (
        <div className="h-screen border-r border-gray-100 w-72 fixed left-0 top-0 bg-white flex flex-col z-30">
            {/* Header: Editorial & Minimal */}
            <div className="p-5 pt-7">
                <div className="flex text-[19px] font-bold items-center text-gray-900 tracking-tight">
                    <div className="pr-2.5 text-purple-600">
                        <Logo />
                    </div>
                    Second Brain
                </div>
            </div>

            {/* Main Navigation: High Density */}
            <div className="px-3.5 space-y-0.5 mb-4">
                <SidebarItem
                    text="All Notes"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>}
                    onClick={() => onFilterChange("all")}
                    active={selectedFilter === "all"}
                />
                <SidebarItem
                    text="Posts"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4.5"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>}
                    onClick={() => onFilterChange("post")}
                    active={selectedFilter === "post"}
                />
                <SidebarItem
                    text="Videos"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4.5"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>}
                    onClick={() => onFilterChange("video")}
                    active={selectedFilter === "video"}
                />
                <SidebarItem
                    text="Documents"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>}
                    onClick={() => onFilterChange("document")}
                    active={selectedFilter === "document"}
                />
            </div>

            <div className="px-5 py-2">
                <div className="border-t border-gray-100 w-full mb-5"></div>
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-3 ml-1">AI Memory Stream</h3>
            </div>

            {/* AI Memory Stream Feed: Quiet & Text-Focused */}
            <div className="flex-1 overflow-y-auto px-3.5 pb-4 custom-scrollbar">
                <div className="space-y-0.5">
                    {insights.map((item) => {
                        const isSelected = item.contentId === selectedContentId;
                        return (
                            <button
                                key={item.id}
                                onClick={() => item.contentId && onSelectInsight?.(item.contentId)}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 group ${
                                    isSelected 
                                        ? "bg-purple-50 text-purple-700 shadow-sm" 
                                        : "hover:bg-gray-50 text-gray-500 hover:text-gray-900"
                                }`}
                            >
                                <p className={`text-[12.5px] font-bold tracking-tight mb-0.5 truncate ${isSelected ? 'text-purple-700' : 'text-gray-700'}`}>
                                    {item.title}
                                </p>
                                <p className={`text-[8.5px] font-bold uppercase tracking-[0.1em] opacity-50`}>
                                    {item.label}
                                </p>
                            </button>
                        );
                    })}
                    {insights.length === 0 && (
                        <p className="text-[11px] text-gray-400 font-medium px-3 italic">
                            Building knowledge stream...
                        </p>
                    )}
                </div>
            </div>

            {/* User Profile: Dense & Professional */}
            <div className="border-t border-gray-100 bg-gray-50/30">
                <div className="p-3.5">
                    <div className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white hover:shadow-sm cursor-pointer transition-all group">
                        <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm transition-all group-hover:scale-105">
                            {username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[12.5px] font-bold text-gray-900 truncate leading-tight">{username}</div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Pro Plan</div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-gray-300 hover:text-red-500 transition-colors p-1"
                            title="Logout"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}