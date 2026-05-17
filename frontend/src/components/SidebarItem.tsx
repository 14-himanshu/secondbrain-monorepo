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
        <div className={`relative flex items-center py-2.5 px-3 cursor-pointer rounded-md transition-colors duration-150 font-inter ${active
                ? "bg-purple-50/60 text-purple-700 font-semibold"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                }`} 
            onClick={onClick}
        >
            {/* left accent bar when active */}
            {active && <span className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-md bg-purple-500" aria-hidden />}
            <div className={`relative z-10 pr-3 transition-colors ${active ? 'text-purple-600' : 'text-gray-400'}`}>{icon}</div>
            <div className="relative z-10 text-[13px] tracking-tight leading-none">{text}</div>
        </div>
    );
}