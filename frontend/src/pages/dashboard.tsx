import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CreateContentModal } from "../components/CreateContentModal";
import { PlusIcon } from "../icons/PlusIcon";
import { Shareicon } from "../icons/ShareIcon";
import { Sidebar } from "../components/Sidebar";
import { useContent } from "../hooks/useContent";
import { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { useNavigate } from "react-router-dom";

export function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { contents, refresh, setContents } = useContent();
  const navigate = useNavigate();

  useEffect(() => {
    refresh();
  }, [modalOpen, refresh]);

  useEffect(() => {
    if (!localStorage.getItem("token")) {
      navigate("/signup");
    }
  });

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

        {/* Header Section */}
        <div className="mb-8 sticky top-0 bg-gray-100/95 backdrop-blur-sm z-10 py-4 -mx-8 px-8 border-b border-gray-200/50">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Title & Count */}
            <div className="shrink-0 min-w-[200px]">
              <h1 className="text-3xl font-bold text-black tracking-tight">
                {selectedFilter === "all" && "All Notes"}
                {selectedFilter === "twitter" && "Tweets"}
                {selectedFilter === "youtube" && "Videos"}
                {selectedFilter === "document" && "Documents"}
                {selectedFilter === "link" && "Links"}
                {selectedFilter === "tag" && "Tags"}
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
                onClick={async () => {
                  const response = await axios.post(
                    `${BACKEND_URL}/api/v1/brain/share`,
                    {
                      share: true,
                    },
                    {
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                          "token"
                        )}`,
                      },
                    }
                  );
                  const shareURL = `${BACKEND_URL}/share/${response.data.hash}`;
                  navigator.clipboard.writeText(shareURL);
                  alert("Link copied to clipboard!");
                }}
                variant="secondary"
                text="Share Brain"
                startIcon={<Shareicon />}
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
                console.log("Edit clicked for:", title, "ID:", _id, "New Title:", newTitle);

                // Optimistic UI update
                setContents(contents.map(c => c._id === _id ? { ...c, title: newTitle } : c));

                try {
                  await axios.put(
                    `${BACKEND_URL}/api/v1/content`,
                    {
                      contentId: _id,
                      title: newTitle
                    },
                    {
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                      },
                    }
                  );
                  await refresh();
                } catch (error: any) {
                  console.error("Edit error:", error);
                  const errorMessage = error.response?.data?.message || error.message || "Unknown error";
                  alert(`Failed to update content: ${errorMessage}`);
                  await refresh();
                }
              }}
              onDelete={async () => {
                console.log("Delete clicked for:", title, "ID:", _id);

                // Optimistic UI update - remove immediately
                setContents(contents.filter((item) => item._id !== _id));

                try {
                  const response = await axios.delete(
                    `${BACKEND_URL}/api/v1/content`,
                    {
                      data: {
                        contentId: _id,
                      },
                      headers: {
                        Authorization: `Bearer ${localStorage.getItem(
                          "token"
                        )}`,
                      },
                    }
                  );
                  console.log("Delete response:", response.data);

                  // Refresh in background to stay in sync with server
                  await refresh();
                } catch (error: any) {
                  console.error("Delete error:", error);
                  const errorMessage = error.response?.data?.message || error.message || "Unknown error";
                  alert(`Failed to delete content: ${errorMessage}`);
                  // Revert the optimistic update on error
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
