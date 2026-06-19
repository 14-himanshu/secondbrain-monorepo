const resolveBackendUrl = () => {
  const envUrl = import.meta.env.VITE_BACKEND_URL?.trim().replace(/\/$/, "");
  const hasEnvUrl = Boolean(envUrl);
  const isBrowser = typeof window !== "undefined";
  const hostname = isBrowser ? window.location.hostname : "";
  const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

  if (hasEnvUrl && (!envUrl?.includes("localhost") || isLocalHost)) {
    return envUrl as string;
  }

  if (isBrowser && !isLocalHost) {
    return window.location.origin;
  }

  return "http://localhost:5001";
};

export const BACKEND_URL = resolveBackendUrl();

export const API_TIMEOUT_MS = Number(
  import.meta.env.VITE_API_TIMEOUT_MS ?? (import.meta.env.DEV ? 20000 : 60000)
);
