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
      <div className="relative w-full space-y-2">
        {label && (
          <label className="block text-xs font-semibold text-gray-600 tracking-wide uppercase">
            {label}
          </label>
        )}
        <div className="relative">
          <ShadcnInput
            ref={ref}
            placeholder={placeholder}
            type={inputType}
            className={`w-full ${isPassword ? "pr-10" : ""}`}
            onFocus={onFocus}
            onBlur={onBlur}
            onChange={onChange}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none"
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
