const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

/**
 * Wraps fetch with the Clerk session token attached. `getToken` comes
 * from Clerk's useAuth() hook - pass it in from the calling component
 * rather than importing a hook here, since this is plain (non-hook) code.
 */
export async function apiFetch(
  path: string,
  getToken: () => Promise<string | null>,
  options: RequestInit = {}
) {
  const token = await getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Call once right after sign-in to upsert the local org/user record from
 * the active Clerk session. Safe to call repeatedly - it's an upsert.
 */
export function syncAuth(getToken: () => Promise<string | null>) {
  return apiFetch("/api/auth/sync", getToken, { method: "POST" });
}