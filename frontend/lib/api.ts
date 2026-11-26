import { getFirebaseAuth } from "./firebase";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getDemoSessionId(): string {
  if (typeof window === "undefined") return "default";
  let id = window.localStorage.getItem("pulse_demo_session");
  if (!id) {
    id = "demo-" + Math.random().toString(36).slice(2, 10);
    window.localStorage.setItem("pulse_demo_session", id);
  }
  return id;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { isDemo?: boolean } = {}
): Promise<T> {
  const { isDemo = true, headers: customHeaders, ...rest } = options;
  const headers = new Headers(customHeaders);

  if (!(rest.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (isDemo) {
    headers.set("X-Demo-Session", getDemoSessionId());
  } else {
    const auth = getFirebaseAuth();
    const user = auth?.currentUser;
    if (user) {
      const token = await user.getIdToken();
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const res = await fetch(path, {
    ...rest,
    headers,
  });

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const err = await res.json();
      if (err?.detail) detail = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail);
    } catch {
      // ignore non-json error body
    }
    throw new ApiError(detail, res.status);
  }

  return res.json() as Promise<T>;
}

export function apiPrefix(isDemo: boolean): string {
  return isDemo ? "/api/v1/demo" : "/api/v1";
}
