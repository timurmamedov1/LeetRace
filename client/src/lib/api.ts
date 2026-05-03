// wrapper around fetch for backend api calls
// vite proxies /api to express in dev, see vite.config.ts

const BASE_URL = '/api';

// set after oauth2 flow completes, sent as Bearer token on all requests
let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
}

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
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
