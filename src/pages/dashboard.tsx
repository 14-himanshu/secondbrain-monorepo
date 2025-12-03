import { useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CreateContentModal } from "../components/CreateContentModal";
import { PlusIcon } from "../icons/PlusIcon";
import { Shareicon } from "../icons/ShareIcon";
import { Sidebar } from "../components/Sidebar";

export function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <div>
      <Sidebar />
      <div className="p-4 ml-72 min-h-screen bg-gray-100 ">
        <CreateContentModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
          }}
        />
        <div className="flex justify-end gap-4">
          <Button
            onClick={() => {
              setModalOpen(true);
            }}
            variant="primary"
            text="Add content"
            startIcon={<PlusIcon />}
          />
          <Button
            variant="secondary"
            text="Share brain"
            startIcon={<Shareicon />}
          />
        </div>
        <div className="flex gap-4">
          <Card
            title="First tweet"
            link="https://twitter.com/BannedV1ds/status/1994893144710942843?s=20"
            type="twitter"
          />
          <Card
            title="First video"
            link="https://youtu.be/x0Edm0w9pc0"
            type="youtube"
          />
        </div>
      </div>
    </div>
  );
}


