import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CreateContentModal } from "../components/CreateContentModal";
import { ShareModal } from "../components/ShareModal";
import { PlusIcon } from "../icons/PlusIcon";
import { Sidebar } from "../components/Sidebar";
import { useContent } from "../hooks/useContent";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { useNavigate } from "react-router-dom";

export function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState<{ shareType: string; shareId: string | null }>({
    shareType: "private",
    shareId: null,
  });
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { contents, refresh, setContents } = useContent();
  const navigate = useNavigate();
  const prevModalOpen = useRef(false);

  // Refresh only when modal transitions from open → closed (i.e. content was just added)
  useEffect(() => {
    if (prevModalOpen.current === true && modalOpen === false) {
      refresh();
    }
    prevModalOpen.current = modalOpen;
  }, [modalOpen, refresh]);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/signup");
    }
    fetchShareStatus();
  }, []);

  async function fetchShareStatus() {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/brain/share-status`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setShareStatus(response.data);
    } catch (e) {
      console.error("Failed to fetch share status", e);
    }
  }

  // Filter contents based on selected filter
  const typeFilteredContents =
    selectedFilter === "all"
      ? contents
      : contents.filter(
        (content) => content.type?.toLowerCase() === selectedFilter
      );

  // Further filter by search query
  const filteredContents = typeFilteredContents.filter((content) =>
    searchQuery
      ? content.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.link?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const getShareButtonConfig = () => {
    switch (shareStatus.shareType) {
      case "link":
        return {
          text: "Link Shared",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
          )
        };
      case "public":
        return {
          text: "Public",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9s2.015-9 4.5-9m0 0a9.004 9.004 0 0 1 8.716 6.747M12 3a9.004 9.004 0 0 0-8.716 6.747" />
            </svg>
          )
        };
      default:
        return {
          text: "Private",
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          )
        };
    }
  };

  const shareConfig = getShareButtonConfig();

  return (
    <div>
      <Sidebar
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
      />
      <div className="p-8 ml-72 min-h-screen bg-gray-100">
        <CreateContentModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
          }}
        />
        <ShareModal 
          open={shareModalOpen} 
          onClose={() => setShareModalOpen(false)} 
          onStatusChange={fetchShareStatus}
        />

        {/* Header Section */}
        <div className="mb-8 sticky top-0 bg-gray-100/95 backdrop-blur-sm z-10 py-4 -mx-8 px-8 border-b border-gray-200/50">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Title & Count */}
            <div className="shrink-0 min-w-[200px]">
              <h1 className="text-3xl font-bold text-black tracking-tight">
              {selectedFilter === "all"      && "All Notes"}
                {selectedFilter === "post"     && "Posts"}
                {selectedFilter === "video"    && "Videos"}
                {selectedFilter === "document" && "Documents"}
              </h1>
              <p className="text-gray-600 text-sm font-medium mt-1">
                {filteredContents.length}{" "}
                {filteredContents.length === 1 ? "item" : "items"}
              </p>
            </div>

            {/* Center: Search Bar */}
            <div className="flex-1 max-w-xl mx-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="size-5 text-gray-400 group-focus-within:text-purple-600 transition-colors"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your brain..."
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 transition-all shadow-sm hover:shadow-md hover:border-gray-300"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="size-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex gap-3 shrink-0">
              <Button
                onClick={() => setShareModalOpen(true)}
                variant="secondary"
                text={shareConfig.text}
                startIcon={shareConfig.icon}
              />
              <Button
                onClick={() => {
                  setModalOpen(true);
                }}
                variant="primary"
                text="Add Content"
                startIcon={<PlusIcon />}
              />
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredContents.map(({ type, link, title, _id }) => (
            <Card
              key={_id}
              title={title}
              link={link}
              type={type}
              onEdit={async (newTitle) => {
                // Optimistic update — no refresh needed on success
                setContents(contents.map(c => c._id === _id ? { ...c, title: newTitle } : c));

                try {
                  await axios.put(
                    `${BACKEND_URL}/api/v1/content`,
                    { contentId: _id, title: newTitle },
                    {
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                      },
                    }
                  );
                } catch (error: any) {
                  const errorMessage = error.response?.data?.message || error.message || "Unknown error";
                  alert(`Failed to update content: ${errorMessage}`);
                  await refresh();
                }
              }}
              onDelete={async () => {
                // Optimistic update — remove immediately, no refresh needed on success
                setContents(contents.filter((item) => item._id !== _id));

                try {
                  await axios.delete(
                    `${BACKEND_URL}/api/v1/content`,
                    {
                      data: { contentId: _id },
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                      },
                    }
                  );
                } catch (error: any) {
                  const errorMessage = error.response?.data?.message || error.message || "Unknown error";
                  alert(`Failed to delete content: ${errorMessage}`);
                  // Revert on error
                  await refresh();
                }
              }}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredContents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="size-16 text-gray-600 mb-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-black mb-2">
              {searchQuery ? "No results found" : "No content yet"}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery
                ? `No content matches "${searchQuery}"`
                : "Start building your second brain by adding content"}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setModalOpen(true)}
                variant="primary"
                text="Add Your First Content"
                startIcon={<PlusIcon />}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
