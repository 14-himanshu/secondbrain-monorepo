import { Card } from "../components/Card";
import { Sidebar } from "../components/Sidebar";
import { useContent } from "../hooks/useContent";
import { useContentMutations } from "../hooks/useContentMutations";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Content } from "../hooks/useContent";

export default function Recents() {
  const { contents } = useContent();
  const { deleteContent, editContent } = useContentMutations();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("sb-sidebar-collapsed") === "true"
  );

  return (
    <div className="flex bg-gray-100 min-h-screen relative overflow-hidden">
      {/* Mobile open sidebar button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-xl bg-white border border-gray-100 shadow-sm"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open navigation"
      >
        <svg className="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>

      <Sidebar
        selectedFilter="all"
        onFilterChange={(filter) => navigate('/', { state: { filter } })}
        contents={contents}
        selectedContentId={null}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectContent={(id) => id && navigate('/', { state: { openId: id } })}
        onCollapsedChange={setSidebarCollapsed}
      />

      <main className={`flex-1 min-h-screen bg-[#FDFDFD] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}`}>
        <div className="px-6 pt-6 pb-8 max-w-[1200px] mx-auto">

          <header className="mb-8 pt-5 pb-6 border-b border-gray-100/60">
            <h1 className="text-[22px] font-bold text-gray-900 tracking-tight leading-none font-outfit">
              Recent Items
            </h1>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-[0.2em] mt-1.5">
              {contents.length} {contents.length === 1 ? "item" : "items"}
            </p>
          </header>

          {contents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6 border border-purple-100/40">
                <svg className="w-7 h-7 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
              <h3 className="text-[18px] font-bold text-gray-800 mb-2 tracking-tight">No recent items</h3>
              <p className="text-gray-400 text-[13px] max-w-[280px] leading-relaxed">
                Items you add or open will appear here.
              </p>
            </div>
          ) : (
            <div
              className="grid gap-5 pb-20"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}
            >
              {contents.map((c: Content) => (
                <Card
                  key={c._id}
                  title={c.title}
                  link={c.link}
                  type={c.type}
                  aiStatus={c.aiStatus}
                  description={c.description}
                  onSelect={() => navigate('/', { state: { openId: c._id } })}
                  onEdit={(newTitle) => editContent({ contentId: c._id, title: newTitle })}
                  onDelete={() => deleteContent(c._id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
