// wrapper around fetch for backend api calls
// in dev vite proxies /api to express on port 3001 (see vite.config.ts)
// in prod express serves the built client files directly

const BASE_URL = '/api';

// set after oauth2 flow finishes, gets sent as Bearer token on every req.
// this is how the server knows who we are without us sending userId in bodies
let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
}

// generic fetch helper, auto-attaches auth header and content type.
// throws on non-2xx responses so callers can just catch
export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });
  if (!res.ok) {
    // try to pull the servers error message out of the response body
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `API error: ${res.status}`);
  }
  return res.json();
}
