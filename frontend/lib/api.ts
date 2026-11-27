import { getFirebaseAuth } from "./firebase";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function toFriendlyErrorMessage(status: number, rawDetail?: string): string {
  if (status === 401) {
    return "Please sign in to continue.";
  }
  if (status === 403) {
    return "You do not have permission to access this information.";
  }
  if (status === 404) {
    return "The requested item could not be found.";
  }
  if (status === 413) {
    return "The uploaded file is too large. Please choose a smaller file.";
  }
  if (status === 400 && rawDetail && !/traceback|sql|exception|fastapi|neon|smtp/i.test(rawDetail)) {
    return rawDetail;
  }
  if (status >= 500) {
    return "We couldn't load your financial information right now. Please try again.";
  }
  return "Something went wrong while processing your request. Please try again.";
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { headers: customHeaders, ...rest } = options;
  const headers = new Headers(customHeaders);

  if (!(rest.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) {
    throw new ApiError("Please sign in to continue.", 401);
  }

  const token = await user.getIdToken();
  headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(path, {
      ...rest,
      headers,
    });
  } catch {
    throw new ApiError("Unable to reach PULSE right now. Please check your connection and try again.", 0);
  }

  if (!res.ok) {
    let rawDetail: string | undefined;
    try {
      const err = await res.json();
      if (typeof err?.detail === "string") {
        rawDetail = err.detail;
      }
    } catch {
      // ignore non-json error body
    }
    throw new ApiError(toFriendlyErrorMessage(res.status, rawDetail), res.status);
  }

  return res.json() as Promise<T>;
}
