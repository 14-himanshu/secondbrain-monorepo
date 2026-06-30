import { useRef, useState } from "react";
import { Input } from "../components/Input";
import { Link, useNavigate } from "react-router-dom";
import { isApiError } from "../lib/apiClient";
import { BACKEND_URL } from "../config";
import { signUp } from "../services/auth.api";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "../icons/Logo";

interface ValidationError {
  path: (string | number)[];
  message: string;
}

export function Signup() {
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmPasswordRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  async function signup() {
    setErrors([]);
    setSuccessMsg("");
    const email = emailRef.current?.value ?? "";
    const password = passwordRef.current?.value ?? "";
    const confirmPassword = confirmPasswordRef.current?.value ?? "";

    if (password !== confirmPassword) {
      setErrors([{ path: ["confirmPassword"], message: "Passwords do not match" }]);
      return;
    }

    setLoading(true);
    const username = email.split('@')[0] || "user";
    try {
      await signUp(username, email, password);
      setSuccessMsg("Account created! Redirecting you to sign in…");
      setTimeout(() => navigate("/login"), 1500);
    } catch (e) {
      if (isApiError(e)) {
        const details = e.details as { errors?: ValidationError[] } | undefined;
        if (details?.errors?.length) { setErrors(details.errors); return; }
        setErrors([{ path: ["general"], message: e.message }]);
        return;
      }
      setErrors([{ path: ["general"], message: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  const emailErrors = errors.filter((e) => e.path?.includes("email"));
  const passwordErrors = errors.filter((e) => e.path?.includes("password"));
  const confirmPasswordErrors = errors.filter((e) => e.path?.includes("confirmPassword"));
  const generalErrors = errors.filter((e) => e.path?.includes("general"));

  return (
    <div className="animate-page-enter min-h-screen w-screen flex flex-col items-center justify-center bg-muted dark:bg-background text-foreground font-sans p-4 py-12 relative overflow-hidden">

      {/* ── Background: dot grid (both modes) + purple radial glow ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:24px_24px] opacity-60 dark:opacity-30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(111,99,217,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(131,120,232,0.14),transparent)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-purple-500/8 dark:bg-purple-600/10 rounded-full blur-[100px]" />
      </div>

      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8 relative z-10">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-[0_0_20px_rgba(111,99,217,0.4)] ring-2 ring-purple-500/20 group-hover:scale-105 transition-all duration-300">
            <Logo className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">Second Brain</span>
        </Link>
        <p className="text-xs text-muted-foreground mt-2 tracking-wide">Your intelligence, amplified.</p>
      </div>

      {/* Card — white + border + shadow in light | glass in dark */}
      <div className="w-full max-w-md mx-auto rounded-2xl border border-border bg-card shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-[#111113]/90 dark:shadow-[0_8px_40px_rgba(0,0,0,0.6)] dark:backdrop-blur-xl overflow-hidden relative z-10">

        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-center text-foreground mb-6 tracking-tight">Create your account</h1>

          {/* Success Banner */}
          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {successMsg}
            </div>
          )}

          {/* Error Banner */}
          {generalErrors.length > 0 && (
            <div className="mb-5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
              {generalErrors[0].message}
            </div>
          )}

          {/* Google OAuth — elevated size & hover */}
          <button
            onClick={() => { window.location.href = `${BACKEND_URL}/api/v1/auth/google/start`; }}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 h-11 rounded-xl border border-border dark:border-white/10 bg-background dark:bg-white/5 hover:bg-muted/70 dark:hover:bg-white/[0.08] text-foreground font-semibold text-sm shadow-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.9 0 6.6 1.6 8.2 3l6-6C34.5 3 29.6 1 24 1 14.8 1 6.9 6.8 3.6 14.9l7.9 6.1C13.4 14.5 18 9.5 24 9.5z"/>
              <path fill="#34A853" d="M46.5 24c0-1.6-.1-3.1-.4-4.6H24v8.7h12.7c-.5 2.6-2 4.8-4.2 6.2l6.5 5C43 36.2 46.5 30.6 46.5 24z"/>
              <path fill="#4A90E2" d="M10.5 28.1A14.7 14.7 0 0110 24c0-1.3.2-2.6.5-3.8L3 14.1C1.1 17.9 0 21.8 0 26c0 4.2 1.1 8.1 3 11.9l7.5-9.8z"/>
              <path fill="#FBBC05" d="M24 46c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2 1.4-4.5 2.3-8.3 2.3-6 0-10.6-5-12.9-10.7L3.6 33.1C6.9 41.2 14.8 46 24 46z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50 dark:border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-card dark:bg-[#111113] text-muted-foreground uppercase tracking-widest font-medium">or</span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Input ref={emailRef} placeholder="you@example.com" label="Email address" type="email" />
              {emailErrors.length > 0 && emailErrors.map((err, i) => (
                <p key={i} className="mt-1 text-destructive text-xs">{err.message}</p>
              ))}
            </div>

            <div>
              <Input ref={passwordRef} placeholder="Create a strong password" label="Password" type="password" />
              {passwordErrors.length > 0 && passwordErrors.map((err, i) => (
                <p key={i} className="mt-1 text-destructive text-xs">{err.message}</p>
              ))}
            </div>

            <div>
              <Input ref={confirmPasswordRef} placeholder="Re-enter your password" label="Confirm password" type="password" />
              {confirmPasswordErrors.length > 0 && confirmPasswordErrors.map((err, i) => (
                <p key={i} className="mt-1 text-destructive text-xs">{err.message}</p>
              ))}
            </div>

            {/* ── Premium CTA Button ── */}
            <div className="pt-1">
              <button
                onClick={signup}
                disabled={loading}
                className="relative w-full h-11 rounded-xl font-bold text-sm tracking-wide text-white overflow-hidden
                  bg-gradient-to-b from-purple-500 to-[#6f63d9]
                  shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,_0_4px_16px_rgba(111,99,217,0.45)]
                  hover:shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,_0_6px_24px_rgba(111,99,217,0.6)]
                  hover:-translate-y-0.5
                  active:translate-y-0 active:shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,_0_2px_8px_rgba(111,99,217,0.3)]
                  transition-all duration-200
                  disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_4px_16px_rgba(111,99,217,0.3)]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                    </svg>
                    Creating account…
                  </span>
                ) : "Create account"}
              </button>
            </div>

            <p className="text-center text-[12px] text-muted-foreground px-4 leading-relaxed">
              By signing up, you agree to our <a href="#" className="underline hover:text-foreground transition-colors">Terms</a> and <a href="#" className="underline hover:text-foreground transition-colors">Privacy Policy</a>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 dark:border-white/[0.06] py-5 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-foreground hover:text-primary transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
