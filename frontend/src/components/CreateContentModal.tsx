import { useRef, useState } from "react";
import { CrossIcon } from "../icons/CrossIcon";
import { Button } from "./Button";
import { Input } from "./Input";
import axios from "axios";
import { BACKEND_URL } from "../config";

const ContentType = {
  Youtube: "Youtube",
  Twitter: "Twitter",
  Document: "Document",
} as const;

export function CreateContentModal({ open, onClose }) {
  const titleRef = useRef<HTMLInputElement | null>(null);
  const linkRef = useRef<HTMLInputElement | null>(null);
  const [type, setType] = useState<
    (typeof ContentType)[keyof typeof ContentType]
  >(ContentType.Youtube);

  async function addContent() {
    const title = titleRef.current?.value;
    const link = linkRef.current?.value;

    if (!title || !link) {
      alert("Please fill in all fields");
      return;
    }

    try {
      await axios.post(
        BACKEND_URL + "/api/v1/content",
        {
          link,
          title,
          type,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      onClose();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Unknown error";
      // Check for validation errors
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors.map((e: any) => e.message).join(", ");
        alert(`Failed to add content: ${validationErrors}`);
      } else {
        alert(`Failed to add content: ${errorMessage}`);
      }
    }
  }

  return (
    <div>
      {open && (
        <div>
          {/* Backdrop */}
          <div className="w-screen h-screen bg-slate-900 fixed top-0 left-0 opacity-50 z-40"></div>

          {/* Modal */}
          <div className="w-screen h-screen fixed top-0 left-0 flex justify-center items-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 relative">
              {/* Close Button */}
              <div className="absolute top-4 right-4">
                <div
                  onClick={onClose}
                  className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <CrossIcon />
                </div>
              </div>

              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-purple-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="size-8"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Add Content</h2>
                </div>
                <p className="text-gray-500 text-sm">Save your favorite content to your Second Brain</p>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <Input ref={titleRef} placeholder="Enter title..." />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link
                  </label>
                  <Input ref={linkRef} placeholder="https://..." />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Content Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      text="YouTube"
                      variant={
                        type === ContentType.Youtube ? "primary" : "secondary"
                      }
                      onClick={() => {
                        setType(ContentType.Youtube);
                      }}
                      fullwidth={true}
                    />
                    <Button
                      text="Twitter"
                      variant={
                        type === ContentType.Twitter ? "primary" : "secondary"
                      }
                      onClick={() => {
                        setType(ContentType.Twitter);
                      }}
                      fullwidth={true}
                    />
                    <Button
                      text="Document"
                      variant={
                        type === ContentType.Document ? "primary" : "secondary"
                      }
                      onClick={() => {
                        setType(ContentType.Document);
                      }}
                      fullwidth={true}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={addContent}
                    variant="primary"
                    text="Add to Brain"
                    fullwidth={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
