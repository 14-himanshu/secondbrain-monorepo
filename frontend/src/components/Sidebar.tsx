import React from 'react';
import { Logo } from "../icons/Logo";
import { SidebarItem } from "./SidebarItem";
import { useNavigate } from "react-router-dom";
import type { Content } from "../hooks/useContent";

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

      <aside className="h-screen w-64 fixed left-0 top-0 bg-white flex flex-col z-30 border-r">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="text-purple-600">
              <Logo />
            </div>
            <div className="font-bold">Second Brain</div>
          </div>
        </div>

        <nav className="px-3 space-y-1">
          <SidebarItem text="Knowledge Base" onClick={() => onFilterChange('all')} active={selectedFilter === 'all'} />
          <SidebarItem text="Articles" onClick={() => onFilterChange('post')} active={selectedFilter === 'post'} />
          <SidebarItem text="Videos" onClick={() => onFilterChange('video')} active={selectedFilter === 'video'} />
        </nav>

        <div className="mt-auto p-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">{username.charAt(0).toUpperCase()}</div>
              <div className="text-sm font-bold">{username}</div>
            </div>
            <button onClick={handleLogout} title="Logout" className="p-2 text-sm text-gray-500">Logout</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default Sidebar;
