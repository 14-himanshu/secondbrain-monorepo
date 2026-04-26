import type { ReactElement } from "react";

interface ButtonProps {
  variant: "primary" | "secondary";
  text: string;
  startIcon?: ReactElement;
  onClick?: () => void;
  fullwidth?: boolean;
  loading?: boolean;
}

const variantClasses = {
  primary: "bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 shadow-sm",
  secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 active:bg-gray-100 shadow-sm",
};

const defaultStyles =
  "px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ";

export function Button({
  variant,
  text,
  startIcon,
  onClick,
  fullwidth,
  loading,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={
        variantClasses[variant] +
        " " +
        defaultStyles +
        `${fullwidth ? " w-full" : ""}
        ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`
      }
      disabled={loading}
    >
      {startIcon && <div className="shrink-0">{startIcon}</div>}
      <span>{text}</span>
    </button>
  );
}
