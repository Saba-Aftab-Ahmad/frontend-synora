/**
 * lib/config.ts
 * Single place for the backend URL + the HTTPS-only rule (SRS: all client <->
 * server traffic over HTTPS).  Plain http:// is accepted ONLY for localhost so
 * you can test on your own computer.
 */
const RAW =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://synora-coordination-server.onrender.com";

function normalise(url: string): string {
  const u = url.trim().replace(/\/+$/, "");
  const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(u);
  if (u.startsWith("https://") || isLocal) return u;
  if (u.startsWith("http://")) return u.replace("http://", "https://"); // force TLS for remote hosts
  return `https://${u}`;
}

export const BACKEND_URL = normalise(RAW);
export const IS_LOCAL_BACKEND = BACKEND_URL.startsWith("http://");

/** Dashboard / status polling interval (SRS NFR-P05: updates within 3 s). */
export const POLL_MS = 2000;
