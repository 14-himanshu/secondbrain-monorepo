import { useState, useEffect } from "react";
import { Logo } from "../icons/Logo";
import { LibraryIcon } from "../icons/LibraryIcon";
import { DocumentIcon } from "../icons/DocumentIcon";
import { YouTubeIcon } from "../icons/YoutubeIcon";
import { TwitterIcon } from "../icons/TwitterIcon";
import type { Content } from "../hooks/useContent";
import { Link, useNavigate } from "react-router-dom";

const COLLAPSED_KEY = "sb-sidebar-collapsed";

function NavItem({
  icon,
  label,
  active,
  isCollapsed,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  isCollapsed: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
        isCollapsed ? "justify-center" : ""
      } ${
        active
          ? "bg-purple-50/50 dark:bg-purple-900/30 text-purple-900 dark:text-purple-300 font-semibold"
          : "text-gray-500 dark:text-gray-400 hover:bg-purple-50/30 dark:hover:bg-purple-900/20 hover:text-purple-800 dark:hover:text-purple-300"
      }`}
    >
      {/* Active pill indicator */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-purple-500" />
      )}

      {/* Icon */}
      <span
        className={`flex-shrink-0 transition-colors duration-200 ${
          active ? "text-purple-700" : "text-gray-400 group-hover:text-purple-500"
        }`}
      >
        {icon}
      </span>

      {/* Label */}
      {!isCollapsed && (
        <span className="text-[13px] font-medium leading-none tracking-tight transition-opacity duration-200">
          {label}
        </span>
      )}

      {/* Collapsed tooltip */}
      {isCollapsed && (
        <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg opacity-0 translate-x-[-6px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
          {label}
        </span>
      )}
    </button>
  );
}

export function Sidebar({
  selectedFilter,
  onFilterChange,
  contents: _contents = [],
  selectedContentId: _selectedContentId,
  isOpen,
  onClose,
  onSelectContent,
  onCollapsedChange,
}: {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  contents?: Content[];
  selectedContentId?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
  onSelectContent?: (contentId: string | null) => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}) {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_KEY) === "true"
  );
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ username: string; avatarBase64?: string }>({
    username: localStorage.getItem("username") || "User"
  });

  useEffect(() => {
    // Fetch latest user info including avatar
    import("../lib/apiClient").then(({ apiClient }) => {
      apiClient.get("/api/v1/me")
        .then(res => setUserProfile({
          username: res.data.username,
          avatarBase64: res.data.avatarBase64
        }))
        .catch(console.error);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, String(isCollapsed));
    onCollapsedChange?.(isCollapsed);
  }, [isCollapsed, onCollapsedChange]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/signin");
  };

  const formatSource = (link?: string) => {
    if (!link) return "";
    try {
      return new URL(link).hostname.replace(/^www\./, "");
    } catch {
      return link.slice(0, 20);
    }
  };

  const getRecentIcon = (type: string) => {
    switch (type) {
      case "video":
        return <YouTubeIcon />;
      case "post":
        return <TwitterIcon />;
      case "document":
      default:
        return <DocumentIcon />;
    }
  };

  const navItems = [
    { key: "all", label: "All Items", icon: <LibraryIcon /> },
    { key: "post", label: "Posts", icon: <TwitterIcon /> },
    { key: "video", label: "Videos", icon: <YouTubeIcon /> },
    { key: "document", label: "Documents", icon: <DocumentIcon /> },
  ];

  const sidebarWidth = isCollapsed ? "w-20" : "w-72";

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`h-screen fixed left-0 top-0 z-30 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-100/80 dark:border-gray-800 shadow-[1px_0_0_0_rgba(0,0,0,0.03)] ${sidebarWidth} transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] transform ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* ── Collapse Toggle ── */}
        <button
          onClick={() => setIsCollapsed((v) => !v)}
          className="absolute top-7 -right-4 z-50 w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-200 dark:hover:border-purple-500 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:scale-105"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.75"
            stroke="currentColor"
            className="w-[18px] h-[18px]"
          >
            <rect width="18" height="18" x="3" y="3" rx="4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v18" />
          </svg>
        </button>

        {/* ── Brand Header ── */}
        <div className={`flex items-center gap-3 px-4 pt-6 pb-5 flex-shrink-0 ${isCollapsed ? "justify-center px-2" : ""}`}>
          <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-md flex items-center justify-center text-white border border-purple-400/30">
            <Logo />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 transition-opacity duration-200">
              <div className="text-[14px] font-bold text-gray-900 dark:text-white tracking-tight leading-none">
                Second Brain
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5 leading-none">
                Workspace
              </div>
            </div>
          )}
        </div>

        {/* ── Main Navigation ── */}
        <div className="flex-shrink-0 px-2">
          {!isCollapsed && (
            <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400">
              Menu
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <NavItem
                key={item.key}
                icon={item.icon}
                label={item.label}
                active={selectedFilter === item.key}
                isCollapsed={isCollapsed}
                onClick={() => onFilterChange(item.key)}
              />
            ))}
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="mx-4 my-4 border-t border-gray-100 dark:border-gray-800" />

        {/* ── Recent Section ── */}
        <div className="flex-1 min-h-0 px-2 flex flex-col">
          {!isCollapsed && (
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400">
                Recent
              </span>
              <Link
                to="/recents"
                className="text-[11px] font-medium text-purple-500 hover:text-purple-700 transition-colors"
              >
                View all
              </Link>
            </div>
          )}

          {isCollapsed && (
            <NavItem
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              }
              label="View All Recents"
              active={false}
              isCollapsed={isCollapsed}
              onClick={() => navigate("/recents")}
            />
          )}

          <div className="flex flex-col gap-0.5 overflow-y-auto max-h-52 scrollbar-none">
            {_contents && _contents.length > 0 ? (
              _contents.slice(0, 5).map((c) => {
                const isActive = _selectedContentId === c._id;
                if (isCollapsed) {
                  return (
                    <button
                      key={c._id}
                      onClick={() => onSelectContent?.(c._id)}
                      className={`group relative flex justify-center items-center p-2.5 rounded-xl transition-all duration-200 ${isActive ? "bg-purple-50 text-purple-900" : "text-gray-400 hover:bg-purple-50/50 hover:text-purple-700"}`}
                      title={c.title}
                    >
                      <div className="scale-75 flex items-center justify-center">
                        {getRecentIcon(c.type)}
                      </div>
                      <span className="pointer-events-none absolute left-full ml-3 z-50 rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg opacity-0 translate-x-[-6px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 w-[180px] line-clamp-2 whitespace-normal break-words leading-snug">
                        {c.title}
                      </span>
                    </button>
                  );
                }
                return (
                  <button
                    key={c._id}
                    onClick={() => onSelectContent?.(c._id)}
                    className={`group relative w-full flex items-center gap-2.5 px-3 py-3 rounded-xl transition-all duration-200 text-left ${isActive ? "bg-purple-50/50 dark:bg-purple-900/30" : "hover:bg-purple-50/30 dark:hover:bg-purple-900/20"}`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 rounded-r-full bg-purple-500" />
                    )}
                    <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${isActive ? "bg-white dark:bg-gray-800 border-purple-100 dark:border-purple-900 text-purple-700 dark:text-purple-400 shadow-sm" : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400 group-hover:border-purple-100 dark:group-hover:border-purple-900 group-hover:text-purple-500"}`}>
                      <div className="scale-75 flex items-center justify-center">
                        {getRecentIcon(c.type)}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-[12px] font-medium line-clamp-2 leading-tight whitespace-normal break-words ${isActive ? "text-purple-900 dark:text-purple-300" : "text-gray-600 dark:text-gray-400 group-hover:text-purple-800 dark:group-hover:text-purple-300"}`}>
                        {c.title}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                          {c.type} · {formatSource(c.link)}
                        </div>
                        {('createdAt' in c && c.createdAt) ? (
                          <div className="text-[9px] font-medium text-gray-400/80 dark:text-gray-500 shrink-0 ml-2">
                            {new Date(c.createdAt as string).toLocaleDateString()}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              !isCollapsed && (
                <div className="px-3 py-3 text-[12px] text-gray-400">
                  No recent items
                </div>
              )
            )}
          </div>
        </div>

        {/* ── Profile Footer ── */}
        <div className="flex-shrink-0 mt-auto">
          <div className="mx-3 mb-3">
            {isCollapsed ? (
              // Collapsed: just centered avatar with hover dropdown
              <div className="relative flex justify-center">
                <button
                  onClick={() => setProfileMenuOpen((v) => !v)}
                  className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 font-bold text-[13px] hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
                  title={userProfile.username}
                >
                  {userProfile.username.charAt(0).toUpperCase()}
                </button>
                {profileMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-44 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg py-1.5 z-50">
                    <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-700">
                      <div className="text-[12px] font-semibold text-gray-800 dark:text-gray-200 truncate">{userProfile.username}</div>
                      <div className="text-[10px] text-gray-500">Member</div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-3 text-[12px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
                       <div className="flex items-center justify-between p-2 group border-t border-gray-50/50 dark:border-gray-800/50 pt-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 font-bold text-[13px] overflow-hidden">
                    {userProfile.avatarBase64 ? (
                      <img src={userProfile.avatarBase64} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      userProfile.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 leading-none truncate max-w-[100px]">
                      {userProfile.username}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 leading-none">Member</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pl-2 border-l border-gray-100 dark:border-gray-800 shrink-0">
                  <button
                    onClick={() => window.location.href = '/settings'}
                    title="Settings"
                    className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  </button>
                  <button
                    onClick={handleLogout}
                    title="Sign out"
                    className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
