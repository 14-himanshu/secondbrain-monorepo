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
            className={`flex items-center py-2.5 px-3 cursor-pointer rounded-md transition-colors duration-150 font-inter ${active
                ? "bg-purple-50 ring-1 ring-purple-50 border-l-4 border-purple-500 text-purple-700 font-semibold"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                }`} 
            onClick={onClick}
        >
            <div className={`pr-3 transition-colors ${active ? 'text-purple-600' : 'text-gray-400'}`}>{icon}</div>
            <div className="text-[13px] tracking-tight leading-none">{text}</div>
        </div>
    );
}