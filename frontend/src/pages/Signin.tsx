import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ValidationIssue } from "@secondbrain/contracts";
import { isApiError } from "../lib/apiClient";
import { signIn } from "../services/auth.api";

export function Signin() {
  const usernameRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signin() {
    setError("");
    setLoading(true);
    const username = usernameRef.current?.value ?? "";
    const password = passwordRef.current?.value ?? "";
    try {
      const response = await signIn(username, password);
      const jwt = response.token;
      localStorage.setItem("token", jwt);
      localStorage.setItem("username", username);
      // After signin, check for saved oauth callback and resume safely
      try {
        const cb = sessionStorage.getItem('oauth_callback');
        if (cb) {
          // Parse and validate TTL (stored as query string with ts param)
          // Expect format: ?integration=...&status=...&reason=...&ts=12345
          const params = new URLSearchParams(cb);
          const ts = Number(params.get('ts') || params.get('timestamp') || 0);
          const now = Date.now();
          if (ts && now - ts < 1000 * 60 * 10) { // 10 minute TTL
            // Redirect to callback route with the saved query string
            navigate(`/integrations/callback${cb}`);
            return;
          }
          // cleanup stale
          sessionStorage.removeItem('oauth_callback');
        }
      } catch {
        // ignore resume errors
      }
      navigate('/');
    } catch (e) {
      if (isApiError(e)) {
        const details = e.details as { errors?: ValidationIssue[] } | undefined;
        if (details?.errors?.length) {
          const messages = details.errors
          .map((err) => err.message)
          .join(". ");
          setError(messages);
          return;
        }
        setError(e.message);
        return;
      }
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen w-screen bg-gray-100 flex">
      {/* ── Left decorative panel ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-purple-600 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background orbs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-500 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 w-80 h-80 bg-purple-200 rounded-full opacity-20 blur-3xl" />

        {/* Logo / brand */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="white" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
            </svg>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">Second Brain</span>
        </div>

        {/* Central copy */}
        <div className="relative z-10">
          <h2 className="text-white text-4xl font-bold leading-tight mb-4">
            Your knowledge,<br />
            <span className="text-purple-200">always within reach.</span>
          </h2>
          <p className="text-purple-200/80 text-base leading-relaxed max-w-sm">
            Capture ideas, save links, and organise everything that matters — all in one beautifully simple place.
          </p>
        </div>

        {/* Floating feature pills */}
        <div className="relative z-10 flex flex-col gap-3">
          {[
            { icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.185 12.317a3 3 0 004.242 0l1.415-1.414a3 3 0 000-4.242 3 3 0 00-4.242 0l-.708.707" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.657 11.657a3 3 0 10-4.242 4.242l.707.707a3 3 0 004.242 0" />
              </svg>
            ), text: "Save links & articles instantly" },
            { icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75H7.5a2.25 2.25 0 00-2.25 2.25V18.75L9 15h7.5A2.25 2.25 0 0018.75 12V6a2.25 2.25 0 00-2.25-2.25z" />
              </svg>
            ), text: "Organise notes effortlessly" },
            { icon: (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
              </svg>
            ), text: "Find anything in seconds" },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 w-fit">
              <span className="shrink-0">{f.icon}</span>
              <span className="text-white/90 text-sm font-medium">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        {/* Mobile brand */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="white" className="w-4.5 h-4.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
            </svg>
          </div>
          <span className="text-gray-800 font-semibold text-base">Second Brain</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Welcome back</h1>
            <p className="text-gray-600 text-sm">Sign in to continue to your Second Brain.</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2.5" role="alert" aria-live="assertive">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 text-red-500 mt-0.5">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Form fields */}
          <div className="flex flex-col gap-4">
            <Input ref={usernameRef} placeholder="Enter your username" label="Username" />
            <Input ref={passwordRef} placeholder="Enter your password" label="Password" type="password" />
          </div>

          {/* CTA */}
          <div className="mt-6">
            <Button
              onClick={signin}
              loading={loading}
              text="Sign In"
              variant="primary"
              fullwidth={true}
            />
          </div>

          {/* Divider */}
          <div className="mt-6 mb-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-600">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <Link to="/signup" className="text-purple-600 font-medium hover:text-purple-500 transition-colors">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
