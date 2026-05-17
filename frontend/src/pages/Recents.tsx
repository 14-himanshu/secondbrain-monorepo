import { Card } from "../components/Card";
import { useContent } from "../hooks/useContent";
import { useNavigate } from "react-router-dom";
import type { Content } from "../hooks/useContent";

export default function Recents() {
  const { contents } = useContent();
  const navigate = useNavigate();

  return (
    <main className="flex-1 lg:ml-72 min-h-screen bg-[#FDFDFD] p-8">
      <div className="max-w-[1200px] mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-800">Recent Items</h1>
          <p className="text-sm text-gray-500 mt-1">Your most recently added or opened items.</p>
        </header>

        <div className="grid gap-6 pb-20" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {contents.map((c: Content) => (
            <div key={c._id} onClick={() => navigate('/', { state: { openId: c._id } })}>
              <Card
                title={c.title}
                link={c.link}
                type={c.type}
                aiStatus={c.aiStatus}
                description={c.description}
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
