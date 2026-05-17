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
}: {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
  contents?: Content[];
  selectedContentId?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "User";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/signin");
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

        {/* Collections: product-oriented list (replaces demo widgets) */}
        <div className="px-3 mt-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">Collections</div>
          <div className="flex flex-col gap-1 px-1">
            <SidebarItem
              text="Research"
              icon={<LibraryIcon />}
              onClick={() => onFilterChange('research')}
              active={selectedFilter === 'research'}
            />
            <SidebarItem
              text="AI Notes"
              icon={<DocumentIcon />}
              onClick={() => onFilterChange('ai-notes')}
              active={selectedFilter === 'ai-notes'}
            />
            <SidebarItem
              text="DPPs"
              icon={<DocumentIcon />}
              onClick={() => onFilterChange('dpps')}
              active={selectedFilter === 'dpps'}
            />
            <SidebarItem
              text="University"
              icon={<LibraryIcon />}
              onClick={() => onFilterChange('university')}
              active={selectedFilter === 'university'}
            />
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
