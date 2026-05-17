import { Logo } from "../icons/Logo";
import type { Content } from "../hooks/useContent";
import { SidebarItem } from "./SidebarItem";
import { useNavigate } from "react-router-dom";

export function Sidebar({
  selectedFilter,
  onFilterChange,
  contents = [],
  selectedContentId,
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

      <aside className="h-screen w-72 fixed left-0 top-0 bg-white flex flex-col z-30 border-r border-gray-50 shadow-sm">
        {/* Left accent strip for stronger identity */}
        <div className="absolute left-0 top-0 h-full w-1.5 bg-purple-600/95" aria-hidden />

        <div className="py-5 px-5">
          <div className="flex items-center gap-3">
            <div className="text-purple-600">
              <Logo />
            </div>
            <div className="font-semibold text-base tracking-tight text-gray-800">Second Brain</div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Organize ideas, capture insights</p>
        </div>

        <nav className="px-3 mt-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">Library</div>
          <div className="space-y-1 px-1">
            <SidebarItem
              text="Knowledge Base"
              icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              onClick={() => onFilterChange('all')}
              active={selectedFilter === 'all'}
            />
            <SidebarItem
              text="Articles"
              icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" d="M8 6h8M8 10h8M8 14h8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              onClick={() => onFilterChange('post')}
              active={selectedFilter === 'post'}
            />
            <SidebarItem
              text="Videos"
              icon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" d="M10 8l6 4-6 4V8z" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              onClick={() => onFilterChange('video')}
              active={selectedFilter === 'video'}
            />
          </div>
        </nav>

        <div className="mt-auto p-4 border-t border-gray-50 bg-white/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-100 ring-1 ring-purple-50 rounded-md flex items-center justify-center text-purple-700 font-semibold">{username.charAt(0).toUpperCase()}</div>
              <div className="text-sm font-medium text-gray-800">{username}</div>
            </div>
            <button onClick={handleLogout} title="Logout" className="px-3 py-1 rounded-md text-sm text-purple-600 border border-transparent hover:bg-purple-50">Sign out</button>
          </div>
          {selectedContentId && (
            (() => {
              const active = contents.find(c => c._id === selectedContentId);
              return active ? (
                <div className="mt-3 text-xs text-gray-500 truncate">Active: {active.title}</div>
              ) : null;
            })()
          )}
        </div>
      </aside>
    </div>
  );
}

export default Sidebar;
