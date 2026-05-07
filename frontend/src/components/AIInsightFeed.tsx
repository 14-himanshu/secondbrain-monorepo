import { useMemo } from "react";

interface InsightItem {
  id: string;
  title: string;
  noteName: string;
  summary: string;
  label: string;
  contentId?: string;
}

interface AIInsightFeedProps {
  contents: any[];
  onSelectInsight: (contentId: string) => void;
  selectedContentId?: string | null;
  isOpen: boolean;
}

export function AIInsightFeed({ contents, onSelectInsight, selectedContentId, isOpen }: AIInsightFeedProps) {
  // Generate mock-like insights from real content to make it feel alive
  const insights: InsightItem[] = useMemo(() => {
    if (contents.length === 0) return [];

    const items: InsightItem[] = [];

    // Add general patterns
    const videoCount = contents.filter(c => c.type === 'video').length;
    if (videoCount > 0) {
      items.push({
        id: 'pattern-video',
        title: "Video-heavy learning",
        noteName: "Multiple Sources",
        summary: "You are consuming a high volume of video content lately.",
        label: "Learning Pattern",
      });
    }

    // Add specific note-based insights
    contents.slice(0, 5).forEach(content => {
      if (content.topics && content.topics.length > 0) {
        items.push({
          id: `insight-${content._id}`,
          title: `Focus: ${content.topics[0]}`,
          noteName: content.title || "Untitled Note",
          summary: content.description?.slice(0, 60) + "..." || "Connecting concepts...",
          label: "Note Context",
          contentId: content._id
        });
      }
    });

    // Add a semantic connection mock
    if (contents.length >= 2) {
      items.push({
        id: 'connection-1',
        title: "Semantic Overlap",
        noteName: `${contents[0].title} & ${contents[1].title}`,
        summary: "These notes share common themes in AI and productivity.",
        label: "Suggested Connection",
        contentId: contents[0]._id
      });
    }

    return items;
  }, [contents]);

  if (!isOpen) return null;

  return (
    <div className="w-[280px] h-screen bg-gray-50/50 border-r border-gray-100 flex flex-col fixed left-72 top-0 z-20">
      <div className="p-6 border-b border-gray-100/50">
        <h2 className="text-[14px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
          <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
          AI Memory Stream
        </h2>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
          Intelligent Feed
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {insights.length === 0 ? (
          <div className="py-12 px-6 text-center">
             <p className="text-[12px] text-gray-400 font-medium italic leading-relaxed">
               Analyzing your second brain for patterns...
             </p>
          </div>
        ) : (
          insights.map((item) => {
            const isSelected = item.contentId === selectedContentId;
            return (
              <button
                key={item.id}
                onClick={() => item.contentId && onSelectInsight(item.contentId)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-200 border group ${
                  isSelected 
                    ? "bg-purple-50/50 border-purple-100 shadow-sm" 
                    : "bg-white border-transparent hover:border-gray-200 hover:bg-gray-50/50"
                }`}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <h4 className={`text-[13px] font-bold tracking-tight transition-colors ${isSelected ? "text-purple-700" : "text-gray-800 group-hover:text-black"}`}>
                    {item.title}
                  </h4>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${isSelected ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-400"}`}>
                    {item.label}
                  </span>
                </div>
                
                <p className="text-[11px] text-gray-500 font-bold mb-2 line-clamp-1">
                  {item.noteName}
                </p>
                
                <p className="text-[12px] text-gray-400 leading-snug line-clamp-2 font-medium">
                  {item.summary}
                </p>
              </button>
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-gray-100/50">
        <div className="bg-gray-100/30 p-3 rounded-lg border border-gray-100/50">
           <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
             Insights update automatically as you save new content.
           </p>
        </div>
      </div>
    </div>
  );
}
