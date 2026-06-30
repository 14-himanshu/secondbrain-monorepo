import { forwardRef, useState } from "react";
import { Input as ShadcnInput } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

interface InputProps {
  placeholder?: string;
  type?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ placeholder, type = "text", onFocus, onBlur, onChange, label }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="block text-sm font-medium text-foreground/80">
            {label}
          </label>
        )}
        <div className="relative">
          <ShadcnInput
            ref={ref}
            placeholder={placeholder}
            type={inputType}
            className={`w-full h-10 text-sm rounded-lg border bg-background text-foreground placeholder:text-muted-foreground/60
              transition-all duration-150
              border-border
              focus-visible:outline-none
              focus-visible:border-primary/70
              focus-visible:ring-2 focus-visible:ring-primary/20
              focus-visible:shadow-[0_0_0_4px_rgba(131,120,232,0.12)]
              ${isPassword ? "pr-10" : ""}`}
            onFocus={onFocus}
            onBlur={onBlur}
            onChange={onChange}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    );
  }
);
