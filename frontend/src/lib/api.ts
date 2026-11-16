import axios, { AxiosError } from 'axios';

/**
 * Single HTTP client for the Laravel API.
 *
 * VITE_API_BASE_URL  e.g. http://localhost:8000/api/v1
 * VITE_AUTH_MODE     "cookie" (Sanctum SPA session) or "token" (Bearer)
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');
export const AUTH_MODE: 'cookie' | 'token' = import.meta.env.VITE_AUTH_MODE === 'token' ? 'token' : 'cookie';

const TOKEN_KEY = 'laundry_pos_token';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
  withCredentials: AUTH_MODE === 'cookie',
  withXSRFToken: AUTH_MODE === 'cookie',
});

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string | null) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

api.interceptors.request.use((config) => {
  if (AUTH_MODE === 'token') {
    const token = tokenStore.get();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const url = error.config?.url ?? '';
    if (error.response?.status === 401 && !url.includes('auth/login') && !url.includes('auth/me')) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

/** Fetch the Sanctum CSRF cookie (cookie mode only) before state-changing auth calls. */
export async function ensureCsrfCookie() {
  if (AUTH_MODE !== 'cookie') return;
  let origin: string;
  try {
    origin = new URL(API_BASE_URL, window.location.href).origin;
  } catch {
    origin = window.location.origin;
  }
  await axios.get(`${origin}/sanctum/csrf-cookie`, { withCredentials: true });
}

export interface ApiError {
  status: number;
  message: string;
  errors: Record<string, string[]>;
}

/** Normalize any thrown request error into a friendly message + field errors. */
export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;

    if (!error.response) {
      return { status: 0, message: 'Cannot reach the server. Check your connection and try again.', errors: {} };
    }

    const fallback: Record<number, string> = {
      403: 'You do not have permission to do that.',
      404: 'The requested record was not found.',
      419: 'Your session expired. Please refresh the page.',
      429: 'Too many requests. Please wait a moment.',
      500: 'Something went wrong on the server. Please try again.',
    };

    return {
      status,
      message: data?.message || fallback[status] || 'Request failed.',
      errors: data?.errors ?? {},
    };
  }

  return { status: 0, message: error instanceof Error ? error.message : 'Unexpected error.', errors: {} };
}

/** First validation message for a field (supports dotted keys like items.0.quantity). */
export function fieldError(errors: Record<string, string[]> | undefined, key: string): string | undefined {
  return errors?.[key]?.[0];
}

/** Download a file (CSV export) through the authenticated client. */
export async function downloadFile(url: string, params: Record<string, unknown>, fallbackName: string) {
  const response = await api.get(url, { params, responseType: 'blob' });
  const disposition = String(response.headers['content-disposition'] ?? '');
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const name = match ? decodeURIComponent(match[1]) : fallbackName;

  const href = URL.createObjectURL(response.data as Blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
