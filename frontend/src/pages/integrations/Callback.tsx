import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getGoogleStatus, connectGoogle } from "../../services/google.api";

export default function IntegrationCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<{ state: 'loading'|'success'|'error'|'needs_auth'; message?: string }>({ state: 'loading' });
  const [integration, setIntegration] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const integ = params.get('integration');
    const s = params.get('status');
    const reason = params.get('reason');

    if (!integ) {
      // Defer setState to avoid sync state-in-effect warning
      setTimeout(() => setStatus({ state: 'error', message: 'No integration specified in callback.' }), 0);
      return;
    }

    // Defer setIntegration to avoid sync state-in-effect
    setTimeout(() => setIntegration(integ), 0);

    // If user not authenticated on frontend, persist params and show guidance to login
    if (!localStorage.getItem('token')) {
      // Save callback params so the app can resume after login
      try {
        // append timestamp for TTL checking
        const ts = Date.now();
        const value = location.search.includes('ts=') ? location.search : `${location.search}&ts=${ts}`;
        sessionStorage.setItem('oauth_callback', value);
      } catch {
        // ignore
      }
      setTimeout(() => setStatus({ state: 'needs_auth', message: 'Please sign in to complete integration.' }), 0);
      return;
    }

    // If the provider indicated failure, show it immediately and try silent refresh
    if (s !== 'connected') {
      setTimeout(() => setStatus({ state: 'error', message: reason ? `Integration failed: ${reason}` : 'Integration failed.' }), 0);
      // Still attempt to refresh server-side status for more detail
      (async () => {
        try {
          const st = await getGoogleStatus();
          if (st?.connected) setStatus({ state: 'success', message: 'Integration connected.' });
        } catch {
          // keep error state
        }
      })();
      return;
    }

    // For success, verify server-side and show success or instruct reauth
    (async () => {
      try {
        const st = await getGoogleStatus();
        if (st?.connected) {
          setStatus({ state: 'success', message: 'Integration connected successfully.' });
        } else {
          setStatus({ state: 'error', message: 'Integration reported success but server shows not connected. Please reconnect.' });
        }
      } catch {
        setStatus({ state: 'error', message: 'Failed to verify integration status. Please check your connections.' });
      }
    })();
  }, [location.search]);

  const handleContinue = () => {
    // Clear any saved callback params
    try { sessionStorage.removeItem('oauth_callback'); } catch { /* ignore session storage errors */ }
    navigate('/dashboard');
  };

  const handleReconnect = async () => {
    try {
      const url = await connectGoogle();
      if (url) window.location.href = url;
    } catch {
      setStatus({ state: 'error', message: 'Failed to start reconnect flow.' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-xl w-full bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-3">Integration callback</h2>
        <p className="text-sm text-gray-600 mb-4">Processing integration callback for: <strong>{integration}</strong></p>

        {status.state === 'loading' && (
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-purple-500 rounded-full animate-spin"></div>
            <div>Verifying integration status...</div>
          </div>
        )}

        {status.state === 'needs_auth' && (
          <div>
            <div className="mb-3 text-sm text-gray-700">You need to sign in to complete this integration. After signing in, return to this page or you will be redirected automatically.</div>
            <div className="flex gap-3">
              <button onClick={() => navigate('/login')} className="px-4 py-2 bg-purple-600 text-white rounded">Sign in</button>
              <button onClick={() => navigate('/signup')} className="px-4 py-2 border rounded">Create account</button>
            </div>
          </div>
        )}

        {status.state === 'success' && (
          <div>
            <div className="mb-4 text-purple-700">{status.message || 'Connected.'}</div>
            <div className="flex gap-3">
              <button onClick={handleContinue} className="px-4 py-2 bg-purple-600 text-white rounded">Go to Dashboard</button>
            </div>
          </div>
        )}

        {status.state === 'error' && (
          <div>
            <div className="mb-4 text-red-700">{status.message || 'Integration failed.'}</div>
            <div className="flex gap-3">
              <button onClick={handleReconnect} className="px-4 py-2 bg-white border rounded">Reconnect</button>
              <button onClick={handleContinue} className="px-4 py-2 bg-indigo-600 text-white rounded">Continue</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
