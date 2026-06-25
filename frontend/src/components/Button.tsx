import type { ReactElement } from "react";
import { Button as ShadcnButton } from "@/components/ui/button";

interface ButtonProps {
  variant: "primary" | "secondary" | "ghost";
  text: string;
  startIcon?: ReactElement;
  onClick?: () => void;
  fullwidth?: boolean;
  loading?: boolean;
  size?: "sm" | "md";
}

export function Button({
  variant,
  text,
  startIcon,
  onClick,
  fullwidth,
  loading,
  size = "md",
}: ButtonProps) {
  const shadcnVariant = variant === "primary" ? "default" : variant === "secondary" ? "outline" : "ghost";
  const shadcnSize = size === "sm" ? "sm" : "default";

  return (
    <ShadcnButton
      variant={shadcnVariant}
      size={shadcnSize}
      onClick={onClick}
      className={`${fullwidth ? "w-full" : ""} rounded-xl font-bold tracking-tight shadow-[0_4px_12px_rgba(109,99,255,0.12)]`}
      disabled={loading}
    >
      {startIcon && <div className="shrink-0 mr-2">{startIcon}</div>}
      <span className="truncate">{text}</span>
    </ShadcnButton>
  );
}
