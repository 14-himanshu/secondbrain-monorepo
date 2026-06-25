import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "../components/Card";
import { Logo } from "../icons/Logo";
import { getPublicBrain } from "../services/share.api";
import { isApiError } from "../lib/apiClient";
import type { ContentDto } from "@secondbrain/contracts";

export function PublicView() {
  const { shareId } = useParams();
  const [content, setContent] = useState<ContentDto[]>([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchSharedBrain() {
      try {
        if (!shareId) throw new Error("Missing share ID");
        const data = await getPublicBrain(shareId);
        setContent(data.content);
        setUsername(data.username);
      } catch (e) {
        if (isApiError(e)) {
          setError(e.message || "This brain is private or doesn't exist.");
          return;
        }
        setError("This brain is private or doesn't exist.");
      } finally {
        setLoading(false);
      }
    }
    fetchSharedBrain();
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-[#6f63d9] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-700 font-medium animate-pulse">Loading shared brain...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
            <p className="text-slate-700">{error}</p>
          </div>
          <a href="/" className="inline-block text-[#6f63d9] font-bold hover:underline">Go to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-[#6f63d9]">
              <Logo />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              {username}'s Second Brain
            </h1>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-slate-500">
            <div className="w-1.5 h-1.5 bg-[#6f63d9] rounded-full animate-pulse"></div>
            READ ONLY MODE
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Shared Notes</h2>
          <p className="text-slate-700 mt-2 font-medium">Viewing {content.length} items from {username}'s collection</p>
        </div>

        {content.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
            {content.map((item) => (
              <Card 
                key={item._id}
                title={item.title}
                link={item.link}
                type={item.type}
                aiMetadata={item.aiMetadata}
                aiStatus={item.aiStatus}
                description={item.description}
                readOnly={true}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
            <p className="text-slate-500 font-medium italic">This brain is currently empty.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-200 mt-12 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-slate-500">Powered by Second Brain</p>
        </div>
      </footer>
    </div>
  );
}
