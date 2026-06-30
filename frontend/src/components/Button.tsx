import type { ReactElement } from "react";
import { Button as ShadcnButton } from "@/components/ui/button";

interface ButtonProps {
  variant: "primary" | "secondary" | "ghost";
  text: string;
  startIcon?: ReactElement;
  onClick?: () => void;
  fullwidth?: boolean;
  loading?: boolean;
  size?: "sm" | "md" | "lg";
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
  const shadcnSize = size === "sm" ? "sm" : size === "lg" ? "lg" : "default";

  // Semantic primary styling
  const primaryStyles = variant === "primary"
    ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
    : "";
    
  const customSizeClasses = size === "lg" ? "h-12 text-base px-8" : "";

  return (
    <ShadcnButton
      variant={shadcnVariant}
      size={shadcnSize}
      onClick={onClick}
      className={`${fullwidth ? "w-full" : ""} rounded-lg font-bold tracking-tight transition-all duration-300 active:scale-[0.98] ${primaryStyles} ${customSizeClasses}`}
      disabled={loading}
    >
      {startIcon && <div className="shrink-0 mr-2">{startIcon}</div>}
      <span className="truncate">{text}</span>
    </ShadcnButton>
  );
}
