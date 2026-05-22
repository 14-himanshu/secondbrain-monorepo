import type { ReactElement } from "react";

export function SidebarItem({
  text,
  icon,
  onClick,
  active = false,
  isCollapsed = false,
}: {
  text: string;
  icon: ReactElement;
  onClick?: () => void;
  active?: boolean;
  isCollapsed?: boolean;
}) {
  return (
    <div 
      className={`relative flex items-center py-2.5 px-3 cursor-pointer rounded-xl transition-all duration-200 font-inter group ${
        isCollapsed ? 'justify-center' : ''
      } ${active
        ? "bg-purple-50/60 text-purple-700 font-semibold shadow-sm shadow-purple-100/30"
        : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
      }`} 
      onClick={onClick}
    >
      {/* Active state vertical indicator */}
      {active && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-md bg-purple-500" aria-hidden />}
      <div className={`relative z-10 transition-colors ${active ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-600'}`}>{icon}</div>
      {!isCollapsed && (
        <div className="relative z-10 text-[13px] tracking-tight leading-none ml-3 animate-in fade-in duration-200">{text}</div>
      )}

      {/* Floating Tooltip when collapsed */}
      {isCollapsed && (
        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 translate-x-[-8px] group-hover:translate-x-0 transition-all duration-200 whitespace-nowrap z-50 shadow-md">
          {text}
        </div>
      )}
    </div>
  );
}