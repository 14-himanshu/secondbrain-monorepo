import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { exchangeLoginCode } from "../services/auth.api";

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("login_code");
      const status = params.get("status");

      if (!code || status !== "success") {
        setError("Authentication failed or missing code.");
        setLoading(false);
        return;
      }

      try {
        const res = await exchangeLoginCode(code);
        if (res && res.token) {
          localStorage.setItem("token", res.token);
          // Clear any oauth resume state
          try { sessionStorage.removeItem('oauth_callback'); } catch {}
          navigate("/");
          return;
        }
        setError("No token returned from server.");
      } catch (e: any) {
        setError(e?.message || "Exchange failed.");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  if (loading) return <div className="h-screen flex items-center justify-center">Completing sign-in…</div>;
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="max-w-md text-center">
        <h2 className="text-lg font-semibold mb-2">Sign-in</h2>
        <p className="text-sm text-red-600">{error}</p>
        <div className="mt-4">
          <button onClick={() => navigate('/signin')} className="px-4 py-2 rounded bg-gray-100">Return to sign in</button>
        </div>
      </div>
    </div>
  );
}
