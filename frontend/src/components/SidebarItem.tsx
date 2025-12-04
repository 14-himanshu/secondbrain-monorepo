import type { ReactElement } from "react";

export function SidebarItem({
    text,
    icon,
    onClick,
    active = false,
}: {
    text: string;
    icon: ReactElement;
    onClick?: () => void;
    active?: boolean;
}) {
    return (
        <div
            className={`flex items-center text-md py-3 px-4 cursor-pointer rounded-lg transition-all duration-200 ${active
                ? "bg-purple-200 text-purple-600 font-medium"
                : "text-gray-700 hover:bg-gray-100"
                }`}
            onClick={onClick}
        >
            <div className="pr-3">{icon}</div>
            <div>{text}</div>
        </div>
    );
}