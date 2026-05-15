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
            className={`flex items-center py-2.5 px-4 cursor-pointer rounded-xl transition-all duration-300 font-inter ${active
                ? "bg-purple-100/60 text-purple-600 font-bold shadow-sm"
                : "text-gray-500 hover:bg-gray-100/50 hover:text-gray-900"
                } active:scale-[0.97]`}
            onClick={onClick}
        >
            <div className={`pr-3 transition-colors ${active ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-600'}`}>{icon}</div>
            <div className="text-[13.5px] tracking-tight">{text}</div>
        </div>
    );
}