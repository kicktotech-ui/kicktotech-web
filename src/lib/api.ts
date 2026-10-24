/**
 * Frontend API client. Talks to the same-origin backend under /api/v1 using
 * HTTP-only cookie sessions (credentials: "include"). Unwraps the standard
 * response envelope and throws a typed ApiError on failure.
 *
 * The UI/service layer depends only on this client — swapping the backend
 * transport later never touches components.
 */

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(status: number, error: ApiErrorShape) {
    super(error.message);
    this.code = error.code;
    this.status = status;
    this.details = error.details;
  }
}

const BASE = "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let token: string | null = null;
  if (typeof window !== "undefined") {
    try {
      if (path.includes("/admin")) {
        token = localStorage.getItem("ktt_admin_token");
      } else {
        token = localStorage.getItem("ktt_student_token") || localStorage.getItem("ktt_admin_token");
      }
    } catch {
      // localStorage access may be restricted
    }
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(0, { code: "NETWORK_ERROR", message: "Network error. Please check your connection." });
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON response */
  }
  const body = json as { success?: boolean; data?: T; error?: ApiErrorShape } | null;

  if (!res.ok || !body?.success) {
    if (
      res.status === 401 &&
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/admin") &&
      window.location.pathname !== "/admin/login"
    ) {
      try {
        localStorage.removeItem("ktt_admin_token");
        localStorage.removeItem("ktt_admin_user");
      } catch {}
      window.location.href = "/admin/login";
    }
    throw new ApiError(res.status, body?.error ?? { code: "SERVER_ERROR", message: "Something went wrong." });
  }
  return body.data as T;
}

export const api = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: "GET" }),
  post: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        ...(init?.headers ?? {}),
      },
    }),
  patch: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        ...(init?.headers ?? {}),
      },
    }),
  del: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: "DELETE" }),
};
