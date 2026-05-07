import type { ReactElement } from "react";

interface ButtonProps {
  variant: "primary" | "secondary" | "ghost";
  text: string;
  startIcon?: ReactElement;
  onClick?: () => void;
  fullwidth?: boolean;
  loading?: boolean;
  size?: "sm" | "md";
}

const variantClasses = {
  primary: "bg-[#6F63D9] text-white hover:bg-[#5B50C4] shadow-[0_4px_12px_rgba(109,99,255,0.12)] border border-transparent",
  secondary: "bg-white text-gray-700 border border-gray-100 hover:bg-gray-50 hover:border-gray-200 shadow-sm",
  ghost: "bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-800",
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
};

const defaultStyles =
  "rounded-xl font-bold tracking-tight transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] ";

export function Button({
  variant,
  text,
  startIcon,
  onClick,
  fullwidth,
  loading,
  size = "md",
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={
        variantClasses[variant] +
        " " +
        sizeClasses[size] +
        " " +
        defaultStyles +
        `${fullwidth ? " w-full" : ""}
        ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`
      }
      disabled={loading}
    >
      {startIcon && <div className="shrink-0">{startIcon}</div>}
      <span className="truncate">{text}</span>
    </button>
  );
}
