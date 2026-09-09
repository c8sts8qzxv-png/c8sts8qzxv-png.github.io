/**
 * Web port of the native app's API client.
 *
 * Same contract, same endpoints, same single-flight refresh. Two things
 * differ, both because the platform differs:
 *
 *  - Tokens live in localStorage rather than expo-secure-store. There is no
 *    Keychain in a browser and pretending otherwise would be worse than
 *    saying so: anything readable by script on this origin is readable by
 *    any script that gets onto this origin.
 *  - The https guard is gone. It exists natively because iOS ATS and Play
 *    review reject cleartext; a browser enforces the equivalent itself and
 *    is stricter about it (an https page cannot call an http API at all).
 */

const RAW_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000';
export const API_BASE_URL = RAW_BASE.replace(/\/+$/, '');

const ACCESS_KEY = 'traverse.rider.access';
const REFRESH_KEY = 'traverse.rider.refresh';

// Every read is guarded. Storage throws outright in a browser set to block
// site data, and a thrown getter here would take down the whole app on load
// rather than degrading to a logged-out state.
function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* private mode: the session simply does not survive a reload */ }
}

export const tokens = {
  access:  () => read(ACCESS_KEY),
  refresh: () => read(REFRESH_KEY),
  set(access: string, refresh: string) { write(ACCESS_KEY, access); write(REFRESH_KEY, refresh); },
  clear() { write(ACCESS_KEY, null); write(REFRESH_KEY, null); },
};

export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly body?: unknown) {
    super(message);
  }
}

let onSessionExpired: (() => void) | null = null;
export function setOnSessionExpired(cb: (() => void) | null) { onSessionExpired = cb; }

// Single-flight: on a cold load several queries 401 at once, and a refresh
// token is one-time-use. Letting each request spend it independently means
// all but one fail and the session is destroyed by its own recovery.
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = tokens.refresh();
      if (!refreshToken) return false;
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        if (!data?.accessToken || !data?.refreshToken) return false;
        tokens.set(data.accessToken, data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const send = async (): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) {
      const token = tokens.access();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  let response: Response;
  try {
    response = await send();
  } catch {
    // A fetch that rejects outright is a transport failure, not an HTTP
    // status. Named so the UI can say "you are offline" rather than showing
    // a raw TypeError the rider cannot act on.
    throw new ApiError(0, 'Could not reach Traverse. Check your connection.');
  }

  if (response.status === 401 && auth && path !== '/auth/refresh') {
    if (await refreshSession()) {
      response = await send();
    } else {
      tokens.clear();
      onSessionExpired?.();
    }
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const parsed = text ? safeJson(text) : undefined;

  if (!response.ok) {
    throw new ApiError(response.status, messageFrom(parsed) ?? response.statusText, parsed);
  }
  return parsed as T;
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return text; }
}

function messageFrom(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const m = (body as { message?: unknown }).message;
  if (typeof m === 'string') return m;
  // Nest's ValidationPipe returns an array of messages; the first is the one
  // closest to what the user just typed.
  if (Array.isArray(m) && typeof m[0] === 'string') return m[0];
  return null;
}
