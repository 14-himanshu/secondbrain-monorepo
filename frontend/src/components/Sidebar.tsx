import { Logo } from "../icons/Logo";
import { LibraryIcon } from "../icons/LibraryIcon";
import { DocumentIcon } from "../icons/DocumentIcon";
import { YouTubeIcon } from "../icons/YoutubeIcon";
import type { Content } from "../hooks/useContent";
import { SidebarItem } from "./SidebarItem";
import { useNavigate } from "react-router-dom";

export function Sidebar({
  selectedFilter,
  onFilterChange,
  contents: _contents = [],
  selectedContentId: _selectedContentId,
  isOpen,
  onClose,
  onSelectContent,
}: {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  contents?: Content[];
  selectedContentId?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
  onSelectContent?: (contentId: string | null) => void;
}) {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "User";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/signin");
  };

  const _formatSource = (link?: string) => {
    if (!link) return '';
    try {
      return new URL(link).hostname.replace(/^www\./, '');
    } catch {
      return link.slice(0, 24);
    }
  };

  return (
    <div>
      {isOpen && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={onClose} />}

      <aside className="h-screen w-72 fixed left-0 top-0 bg-white/95 flex flex-col z-30 border-r border-gray-50 shadow-sm">
        {/* Subtle layered tint along left edge */}
        <div className="absolute left-0 top-0 h-full w-2 bg-purple-600/80 shadow-sm" aria-hidden />

        <div className="pt-6 px-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="text-purple-600">
              <Logo />
            </div>
            <div className="font-semibold text-base tracking-tight text-gray-800">Second Brain</div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Organize ideas, capture insights</p>
        </div>

        <nav className="px-3 mt-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Library</div>
          <div className="flex flex-col gap-1 px-1">
            <SidebarItem
              text="Knowledge Base"
              icon={<LibraryIcon />}
              onClick={() => onFilterChange('all')}
              active={selectedFilter === 'all'}
            />
            <SidebarItem
              text="Articles"
              icon={<DocumentIcon />}
              onClick={() => onFilterChange('post')}
              active={selectedFilter === 'post'}
            />
            <SidebarItem
              text="Videos"
              icon={<YouTubeIcon />}
              onClick={() => onFilterChange('video')}
              active={selectedFilter === 'video'}
            />
          </div>
        </nav>

        {/* Recent Memories: show up to 4 recent items from contents (non-interactive list) */}
        <div className="px-3 mt-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">Recent</div>
            <div className="text-xs px-2">
              <a href="/recents" className="text-purple-600 hover:underline">View all</a>
            </div>
          </div>
          <div className="flex flex-col gap-2 px-1">
            {_contents && _contents.length > 0 ? (
              _contents.slice(0, 4).map((c) => {
                const isActive = _selectedContentId === c._id;
                return (
                <button key={c._id} onClick={() => onSelectContent?.(c._id)} aria-current={isActive ? 'true' : undefined} className={`w-full text-left flex items-center gap-3 p-2 rounded-md transition-colors ${isActive ? 'bg-purple-50/60 text-purple-700' : 'hover:bg-gray-50'}`}>
                  {isActive && <span className="absolute left-2 h-7 w-1.5 bg-purple-500 rounded-r-md" aria-hidden />}
                  <div className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-50 border border-gray-50 text-gray-700 z-10">
                    {c.type === 'video' ? <YouTubeIcon /> : <DocumentIcon />}
                  </div>
                  <div className="min-w-0 z-10">
                    <div className={`text-sm font-medium truncate ${isActive ? 'text-purple-700' : 'text-gray-800'}`}>{c.title}</div>
                    <div className="text-xs text-gray-400 truncate">{c.type} • {_formatSource(c.link)}</div>
                  </div>
                </button>
              )})
            ) : (
              <div className="text-xs text-gray-400 px-2">No recent items</div>
            )}
          </div>
        </div>

        <div className="mt-auto px-4 py-4 border-t border-gray-50 bg-white/95">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-700 font-semibold text-sm ring-1 ring-purple-50">{username.charAt(0).toUpperCase()}</div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-800 leading-tight truncate">{username}</div>
              <div className="text-xs text-gray-400">Member</div>
            </div>

            <div className="flex-shrink-0">
              <button
                onClick={handleLogout}
                title="Sign out"
                className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-purple-600 border border-transparent hover:bg-purple-50 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default Sidebar;
