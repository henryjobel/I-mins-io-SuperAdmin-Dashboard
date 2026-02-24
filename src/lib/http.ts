const DEFAULT_API_BASE_URL = "http://localhost:4000";
const ACCESS_TOKEN_KEY = "super-admin-access-token";
const REFRESH_TOKEN_KEY = "super-admin-refresh-token";
const AUTH_PATH_PREFIX = "/api/auth/";
const REFRESH_PATH = "/api/auth/refresh";
let refreshPromise: Promise<string> | null = null;

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export function getApiBaseUrl() {
  const value = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).trim();
  return value.replace(/\/+$/, "");
}

export function getAccessToken() {
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAuthTokens(accessToken: string, refreshToken?: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearAuthTokens() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function buildQuery(
  path: string,
  query: Record<string, string | number | boolean | undefined | null>,
) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const encoded = params.toString();
  return encoded ? `${path}?${encoded}` : path;
}

async function parseResponseBody(response: Response) {
  const raw = await response.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function normalizePath(path: string) {
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return withSlash.split("?")[0].toLowerCase();
}

function isAuthPath(path: string) {
  return normalizePath(path).startsWith(AUTH_PATH_PREFIX);
}

function isRefreshPath(path: string) {
  return normalizePath(path) === REFRESH_PATH;
}

function getErrorMessage(payload: unknown, response: Response) {
  return (
    (payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof (payload as { message?: unknown }).message === "string"
      ? (payload as { message: string }).message
      : response.statusText) || "Request failed"
  );
}

async function performRequest(path: string, init: RequestInit = {}, accessToken?: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${getApiBaseUrl()}${normalizedPath}`;
  const headers = new Headers(init.headers || {});
  const token = accessToken ?? getAccessToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  const payload = await parseResponseBody(response);
  return { response, payload };
}

async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearAuthTokens();
    throw new ApiError("Session expired. Please sign in again.", 401, null);
  }

  refreshPromise = (async () => {
    const { response, payload } = await performRequest(REFRESH_PATH, {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearAuthTokens();
      throw new ApiError(getErrorMessage(payload, response), response.status, payload);
    }

    const nextAccessToken =
      payload && typeof payload === "object" && "accessToken" in payload
        ? (payload as { accessToken?: unknown }).accessToken
        : null;
    const nextRefreshToken =
      payload && typeof payload === "object" && "refreshToken" in payload
        ? (payload as { refreshToken?: unknown }).refreshToken
        : null;

    if (typeof nextAccessToken !== "string" || !nextAccessToken.trim()) {
      clearAuthTokens();
      throw new ApiError("Invalid refresh response", 401, payload);
    }

    setAuthTokens(
      nextAccessToken,
      typeof nextRefreshToken === "string" && nextRefreshToken.trim() ? nextRefreshToken : undefined,
    );

    return nextAccessToken;
  })()
    .catch((error) => {
      clearAuthTokens();
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError("Session expired. Please sign in again.", 401, null);
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}) {
  const initial = await performRequest(path, init);
  if (initial.response.ok) {
    return initial.payload as T;
  }

  const shouldRetry = initial.response.status === 401 && !isAuthPath(path) && !isRefreshPath(path);
  if (shouldRetry) {
    const refreshedAccessToken = await refreshAccessToken();
    const retried = await performRequest(path, init, refreshedAccessToken);
    if (retried.response.ok) {
      return retried.payload as T;
    }
    if (retried.response.status === 401) {
      clearAuthTokens();
    }
    throw new ApiError(getErrorMessage(retried.payload, retried.response), retried.response.status, retried.payload);
  }

  throw new ApiError(getErrorMessage(initial.payload, initial.response), initial.response.status, initial.payload);
}
