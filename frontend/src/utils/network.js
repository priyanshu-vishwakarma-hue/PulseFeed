function ensureTrailingSlashRemoved(url) {
  return (url || "").replace(/\/$/, "");
}

function getOrigin(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return rawUrl;
  }
}

export function getApiBaseUrl() {
  const raw = ensureTrailingSlashRemoved(import.meta.env.VITE_BACKEND_URL || "");
  if (!raw) return "";

  if (import.meta.env.PROD) {
    return raw.replace(/^http:\/\//i, "https://");
  }

  return raw;
}

export function getSocketBaseUrl() {
  const explicitSocket = ensureTrailingSlashRemoved(import.meta.env.VITE_SOCKET_URL || "");
  const raw = explicitSocket || getOrigin(getApiBaseUrl());
  if (!raw) return "";

  if (import.meta.env.PROD) {
    if (raw.startsWith("https://")) return raw;
    if (raw.startsWith("http://")) return raw.replace("http://", "https://");
  }

  return raw;
}
