import { useEffect, useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { CreateContentModal } from "../components/CreateContentModal";
import { PlusIcon } from "../icons/PlusIcon";
import { Shareicon } from "../icons/ShareIcon";
import { Sidebar } from "../components/Sidebar";
import { useContent } from "../hooks/useContent";
import axios from "axios";
import { BACKEND_URL } from "../config";

export function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const {contents,refresh} = useContent();
  useEffect(()=>{
    refresh()
  },[modalOpen, refresh])
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
          onClick={async ()=>{
            const response = await axios.post(`${BACKEND_URL}/api/v1/brain/share`,{
                share : true
            },{
                headers : {
                    Authorization : `Bearer ${localStorage.getItem("token")}`
                }
            })
            const shareURL = `http://localhost:5173/share/${response.data.hash}`;
            navigator.clipboard.writeText(shareURL);
          }}
            variant="secondary"
            text="Share brain"
            startIcon={<Shareicon />}
          />
        </div>
        <div className="flex gap-4 flex-wrap">
          {contents.map(({ link, type, title }) => (
            <Card title={title} link={link} type={type} />
          ))}
        </div>
      </div>
    </div>
  );
}
