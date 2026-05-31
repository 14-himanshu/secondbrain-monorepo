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
          ? "bg-purple-50 text-purple-700"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
      }`}
    >
      {/* Active pill indicator */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-purple-500" />
      )}

      {/* Icon */}
      <span
        className={`flex-shrink-0 transition-colors duration-200 ${
          active ? "text-purple-600" : "text-gray-400 group-hover:text-gray-600"
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
  const username = localStorage.getItem("username") || "User";
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_KEY) === "true"
  );
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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

  const navItems = [
    { key: "all", label: "Knowledge Base", icon: <LibraryIcon /> },
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
        className={`h-screen fixed left-0 top-0 z-30 flex flex-col bg-white border-r border-gray-100/80 shadow-[1px_0_0_0_rgba(0,0,0,0.03)] ${sidebarWidth} transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden`}
      >
        {/* ── Collapse Toggle ── */}
        <button
          onClick={() => setIsCollapsed((v) => !v)}
          className={`fixed top-7 z-50 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 hover:text-purple-600 hover:border-purple-200 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:scale-105 ${isCollapsed ? 'left-[64px]' : 'left-[272px]'}`}
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
          <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100/60">
            <Logo />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 transition-opacity duration-200">
              <div className="text-[14px] font-bold text-gray-900 tracking-tight leading-none">
                Second Brain
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5 leading-none">
                Knowledge workspace
              </div>
            </div>
          )}
        </div>

        {/* ── Main Navigation ── */}
        <div className="flex-shrink-0 px-2">
          {!isCollapsed && (
            <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
              Library
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
        <div className="mx-4 my-4 border-t border-gray-100" />

        {/* ── Recent Section ── */}
        <div className="flex-1 min-h-0 px-2 flex flex-col">
          {!isCollapsed && (
            <div className="px-3 mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
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
                      className={`group relative flex justify-center items-center p-2.5 rounded-xl transition-all duration-200 ${isActive ? "bg-purple-50 text-purple-600" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"}`}
                      title={c.title}
                    >
                      <span className="text-[11px] font-bold">
                        {c.title.charAt(0).toUpperCase()}
                      </span>
                      <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg opacity-0 translate-x-[-6px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 max-w-[180px] truncate">
                        {c.title}
                      </span>
                    </button>
                  );
                }
                return (
                  <button
                    key={c._id}
                    onClick={() => onSelectContent?.(c._id)}
                    className={`group relative w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 text-left ${isActive ? "bg-purple-50/70" : "hover:bg-gray-50"}`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 rounded-r-full bg-purple-400" />
                    )}
                    <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold border ${isActive ? "bg-purple-100 border-purple-200 text-purple-700" : "bg-gray-50 border-gray-100 text-gray-500"}`}>
                      {c.title.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-[12px] font-medium truncate leading-tight ${isActive ? "text-purple-700" : "text-gray-700 group-hover:text-gray-900"}`}>
                        {c.title}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate mt-0.5">
                        {c.type} · {formatSource(c.link)}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              !isCollapsed && (
                <div className="px-3 py-2 text-[12px] text-gray-400">
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
                  className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100/60 flex items-center justify-center text-purple-700 font-bold text-[13px] hover:bg-purple-100 transition-all duration-200"
                  title={username}
                >
                  {username.charAt(0).toUpperCase()}
                </button>
                {profileMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-44 bg-white border border-gray-100 rounded-xl shadow-lg py-1.5 z-50">
                    <div className="px-3 py-2 border-b border-gray-50">
                      <div className="text-[12px] font-semibold text-gray-800 truncate">{username}</div>
                      <div className="text-[10px] text-gray-400">Member</div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-[12px] text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
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
              // Expanded: full profile card
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/80 border border-gray-100/80 group">
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-purple-50 border border-purple-100/60 flex items-center justify-center text-purple-700 font-bold text-[13px]">
                  {username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-gray-800 leading-none truncate">
                    {username}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Member</div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 opacity-0 group-hover:opacity-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
