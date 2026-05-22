/**
 * Browser requests use same-origin `/api/*` (proxied via next.config rewrites).
 * Set NEXT_PUBLIC_API_URL when the API is hosted on another origin (e.g. Render).
 */
export function getApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (configured) return configured;
  if (typeof window !== 'undefined') return '';
  return (process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBase();
  return base ? `${base}${normalized}` : normalized;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(apiUrl(path), init);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        'Cannot reach the QuantEdge API. Start the backend (npm run dev in backend/) or configure NEXT_PUBLIC_API_URL.',
      );
    }
    throw error;
  }
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      typeof body === 'object' && body && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}
