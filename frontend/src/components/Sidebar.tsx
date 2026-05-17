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

      <aside className="h-screen w-72 fixed left-0 top-0 bg-white/95 flex flex-col z-30 border-r border-gray-50 shadow-sm">
        {/* Subtle layered tint along left edge */}
        <div className="absolute left-0 top-0 h-full w-2 bg-purple-600/80 shadow-sm" aria-hidden />

        <div className="pt-6 px-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="text-purple-600">
              <Logo />
            </div>
            <div className="font-semibold text-base tracking-tight text-gray-800">Second Brain</div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Organize ideas, capture insights</p>

          {/* Active context preview - compact card */}
          <div className="mt-4 px-3 py-3 rounded-lg border-2 border-dashed border-gray-100 bg-white/50 text-center text-sm text-gray-400">
            <div className="text-xs uppercase tracking-wide text-gray-300 mb-1">Active Context</div>
            <div className="text-sm text-gray-500">No active memory loaded</div>
          </div>
        </div>

        <nav className="px-2 mt-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Library</div>
          <div className="flex flex-col gap-1 px-1">
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

        {/* Neural Signals - small contextual cards */}
        <div className="px-3 mt-4 space-y-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">Neural Signals</div>
          <div className="flex flex-col gap-2 px-1">
            <div className="rounded-lg p-3 bg-white shadow-[0_4px_10px_-8px_rgba(16,24,40,0.04)] border border-gray-50">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[13px] font-semibold text-gray-800">Connection</div>
                  <div className="text-xs text-gray-500">Related topic detected: <span className="text-gray-700 font-medium">Semantic Search</span></div>
                </div>
                <div className="flex items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-1 ring-emerald-50" aria-hidden />
                </div>
              </div>
            </div>

            <div className="rounded-lg p-3 bg-white shadow-[0_4px_10px_-8px_rgba(16,24,40,0.04)] border border-gray-50">
              <div className="text-[13px] font-semibold text-gray-800">AI Signal</div>
              <div className="text-xs text-gray-500">High overlap with <span className="text-gray-700 font-medium">AI architecture</span> notes</div>
            </div>
          </div>
        </div>

        <div className="mt-auto px-4 py-3 border-t border-gray-50 bg-white/95">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-100 ring-1 ring-purple-50 rounded-md flex items-center justify-center text-purple-700 font-semibold">{username.charAt(0).toUpperCase()}</div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-800 leading-tight">{username}</div>
              <div className="text-xs text-gray-400">{/* optional email or role */}</div>
            </div>
            <button onClick={handleLogout} title="Logout" className="text-sm text-purple-600 hover:underline">Sign out</button>
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
