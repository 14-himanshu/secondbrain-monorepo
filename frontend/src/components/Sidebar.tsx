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

      <aside className="h-screen w-72 fixed left-0 top-0 bg-white flex flex-col z-30 border-r shadow-sm">
        {/* Left accent strip for stronger identity */}
        <div className="absolute left-0 top-0 h-full w-1 bg-purple-600" aria-hidden />

        <div className="p-5 pl-6">
          <div className="flex items-center gap-3">
            <div className="text-purple-600">
              <Logo />
            </div>
            <div className="font-semibold text-lg tracking-tight">Second Brain</div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Organize ideas, capture insights</p>
        </div>

        <nav className="px-4 mt-4 space-y-2"> 
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
        </nav>

        <div className="mt-auto p-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">{username.charAt(0).toUpperCase()}</div>
              <div className="text-sm font-bold">{username}</div>
            </div>
            <button onClick={handleLogout} title="Logout" className="p-2 text-sm text-gray-500">Logout</button>
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
