import { backendUrl } from "./configENV";

export const AUTH_TOKEN_KEY = "authToken";

// ── Token + headers ──────────────────────────────────────────────────────────

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Same signature/behaviour as the old in-component helper. */
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/** For public routes (no auth required). */
export function getPublicHeaders(): Record<string, string> {
  return { "Content-Type": "application/json" };
}

// ── Errors ───────────────────────────────────────────────────────────────────

/**
 * Thrown for any non-2xx response. `data` holds the parsed JSON body so callers
 * can still read extra fields (e.g. `requiresWinner`, `assignees`, `details`).
 */
export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// ── Request helper ───────────────────────────────────────────────────────────

export interface RequestOptions {
  /** Defaults to true. Set false for public routes. */
  auth?: boolean;
  /** Plain objects are JSON-encoded; FormData is sent as-is. */
  body?: unknown;
  /** Query string params. undefined/null/"" values are dropped. */
  query?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Message used when the server doesn't send `error` / `message`. */
  fallbackError?: string;
}

function buildQuery(query?: RequestOptions["query"]): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const str = params.toString();
  return str ? `?${str}` : "";
}

async function request<T = any>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { auth = true, body, query, headers, signal, fallbackError } = opts;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  let baseHeaders: Record<string, string>;
  if (isForm) {
    // Let the browser set the multipart boundary; only add auth.
    const token = getAuthToken();
    baseHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  } else {
    baseHeaders = auth ? getAuthHeaders() : getPublicHeaders();
  }

  const res = await fetch(`${backendUrl}${path}${buildQuery(query)}`, {
    method,
    headers: { ...baseHeaders, ...headers },
    body:
      body === undefined
        ? undefined
        : isForm
          ? (body as FormData)
          : JSON.stringify(body),
    signal,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      data?.error ||
        data?.message ||
        fallbackError ||
        `Request failed (${res.status})`,
      res.status,
      data,
    );
  }

  return data as T;
}

export const api = {
  get: <T = any>(path: string, opts?: RequestOptions) =>
    request<T>("GET", path, opts),
  post: <T = any>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("POST", path, { ...opts, body }),
  put: <T = any>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("PUT", path, { ...opts, body }),
  patch: <T = any>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("PATCH", path, { ...opts, body }),
  delete: <T = any>(path: string, opts?: RequestOptions) =>
    request<T>("DELETE", path, opts),
};
