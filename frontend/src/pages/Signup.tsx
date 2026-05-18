import { useRef, useState } from "react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Link, useNavigate } from "react-router-dom";
import { isApiError } from "../lib/apiClient";
import { BACKEND_URL } from "../config";
import { signUp } from "../services/auth.api";

interface ValidationError {
  path: (string | number)[];
  message: string;
}

const PASSWORD_REQUIREMENTS = [
  { label: "8+ characters", test: (v: string) => v.length >= 8 },
  { label: "Max 30 characters", test: (v: string) => v.length <= 30 },
  { label: "One uppercase", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One lowercase", test: (v: string) => /[a-z]/.test(v) },
  { label: "One number", test: (v: string) => /[0-9]/.test(v) },
  { label: "One special char", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

export function Signup() {
  const usernameRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [passwordValue, setPasswordValue] = useState("");
  const [showRequirements, setShowRequirements] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  async function signup() {
    setErrors([]);
    setSuccessMsg("");
    setLoading(true);
    const username = usernameRef.current?.value ?? "";
    const password = passwordRef.current?.value ?? "";
    try {
      await signUp(username, password);
      setSuccessMsg("Account created! Redirecting you to sign in…");
      setTimeout(() => navigate("/signin"), 1500);
    } catch (e) {
      if (isApiError(e)) {
        const details = e.details as { errors?: ValidationError[] } | undefined;
        if (details?.errors?.length) {
          setErrors(details.errors);
          return;
        }
        setErrors([{ path: ["general"], message: e.message }]);
        return;
      }
      setErrors([{ path: ["general"], message: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  const usernameErrors = errors.filter((e) => e.path?.includes("username"));
  const passwordErrors = errors.filter((e) => e.path?.includes("password"));
  const generalErrors = errors.filter((e) => e.path?.includes("general"));

  const allRequirementsMet = PASSWORD_REQUIREMENTS.every((r) => r.test(passwordValue));
  const strengthCount = PASSWORD_REQUIREMENTS.filter((r) => r.test(passwordValue)).length;
  const strengthPct = Math.round((strengthCount / PASSWORD_REQUIREMENTS.length) * 100);
  const strengthColor =
    strengthCount <= 2 ? "bg-red-400" :
      strengthCount <= 4 ? "bg-yellow-400" :
        "bg-green-500";
  const strengthLabel =
    strengthCount <= 2 ? "Weak" :
      strengthCount <= 4 ? "Good" :
        "Strong";

  return (
    <div className="min-h-screen w-screen bg-gray-100 flex">
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
            Start building<br />
            <span className="text-purple-200">your second brain.</span>
          </h2>
          <p className="text-purple-200/80 text-base leading-relaxed max-w-sm">
            Join thousands who capture what matters, stay organised, and never lose an idea again.
          </p>
        </div>

        {/* Testimonial / social proof */}
        <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-2xl p-5">
          <p className="text-white/90 text-sm leading-relaxed mb-3">
            "Second Brain changed how I work. Everything I need is organised and instantly searchable."
          </p>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center text-purple-600 font-bold text-xs">
              AK
            </div>
            <div>
              <p className="text-white text-xs font-semibold">Aryan K.</p>
              <p className="text-purple-200/70 text-xs">Product Designer</p>
            </div>
          </div>
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
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Create your account</h1>
            <p className="text-gray-600 text-sm">It's free and takes less than a minute.</p>
          </div>

          {/* General error banner */}
          {generalErrors.length > 0 && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2.5" role="alert" aria-live="assertive">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 text-red-500 mt-0.5">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              <p className="text-red-600 text-sm">{generalErrors[0].message}</p>
            </div>
          )}

          {/* Success banner */}
          {successMsg && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-green-50 border border-green-100 flex items-start gap-2.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 text-green-500 mt-0.5">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
              <p className="text-green-700 text-sm">{successMsg}</p>
            </div>
          )}

          {/* Username field */}
          <div className="mb-4">
            <Input ref={usernameRef} placeholder="Choose a username" label="Username" />
            {usernameErrors.length > 0 && (
              <div className="mt-1.5 flex flex-col gap-0.5">
                {usernameErrors.map((err, i) => (
                  <p key={i} className="text-red-500 text-xs flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 shrink-0">
                      <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
                    {err.message}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Password field */}
          <div className="mb-2">
            <Input
              ref={passwordRef}
              placeholder="Create a strong password"
              label="Password"
              type="password"
              onFocus={() => setShowRequirements(true)}
              onBlur={() => { if (passwordValue.length === 0) setShowRequirements(false); }}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasswordValue(e.target.value)}
            />
            {showRequirements && (
              <p className="mt-1.5 text-xs text-gray-500">
                Use 8-30 characters with uppercase, lowercase, a number, and a special character.
              </p>
            )}
            {passwordErrors.length > 0 && (
              <div className="mt-1.5 flex flex-col gap-0.5">
                {passwordErrors.map((err, i) => (
                  <p key={i} className="text-red-500 text-xs flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 shrink-0">
                      <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
                    {err.message}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Strength bar */}
          {passwordValue.length > 0 && (
            <div className="mb-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                  Password strength
                </span>
                <span className="text-[11px] font-semibold text-gray-500">
                  {strengthLabel}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${strengthColor}`}
                  style={{ width: `${strengthPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Requirement checklist */}
          {showRequirements && (
            <div className="mb-5 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {PASSWORD_REQUIREMENTS.map((req, i) => {
                  const met = req.test(passwordValue);
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors duration-200 ${
                        met
                          ? "text-emerald-700"
                          : "text-gray-500"
                      }`}
                    >
                      <span className={`flex h-4.5 w-4.5 items-center justify-center rounded-full ${
                        met ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-slate-400"
                      }`}>
                        {met ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                            <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.312a1 1 0 0 1-1.42-.002l-3.25-3.288a1 1 0 0 1 1.422-1.41l2.54 2.57 6.54-6.596a1 1 0 0 1 1.412 0Z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        )}
                      </span>
                      <span>{req.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CTA */}
          <Button
            onClick={signup}
            loading={loading}
            text={allRequirementsMet || passwordValue.length === 0 ? "Create Account" : "Create Account"}
            variant="primary"
            fullwidth={true}
          />

          {/* Divider */}
          <div className="mt-6 mb-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-600">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google sign-up button */}
          <div className="mb-4">
            <button
              onClick={async () => { window.location.href = `${BACKEND_URL}/api/v1/auth/google/start`; }}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-sm'}`}>
              <svg className="w-5 h-5" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#EA4335" d="M24 9.5c3.9 0 6.6 1.6 8.2 3l6-6C34.5 3 29.6 1 24 1 14.8 1 6.9 6.8 3.6 14.9l7.9 6.1C13.4 14.5 18 9.5 24 9.5z"/>
                <path fill="#34A853" d="M46.5 24c0-1.6-.1-3.1-.4-4.6H24v8.7h12.7c-.5 2.6-2 4.8-4.2 6.2l6.5 5C43 36.2 46.5 30.6 46.5 24z"/>
                <path fill="#4A90E2" d="M10.5 28.1A14.7 14.7 0 0110 24c0-1.3.2-2.6.5-3.8L3 14.1C1.1 17.9 0 21.8 0 26c0 4.2 1.1 8.1 3 11.9l7.5-9.8z"/>
                <path fill="#FBBC05" d="M24 46c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2 1.4-4.5 2.3-8.3 2.3-6 0-10.6-5-12.9-10.7L3.6 33.1C6.9 41.2 14.8 46 24 46z"/>
              </svg>
              <span className="text-sm font-medium">Continue with Google</span>
            </button>
          </div>

          {/* Sign-in link */}
          <p className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/signin" className="text-purple-600 font-medium hover:text-purple-500 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
