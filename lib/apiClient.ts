/**
 * Get the base URL for API calls
 * Uses environment variable if set, otherwise uses same origin
 */
export function getApiBaseUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    
    // If empty or not set, return empty string (relative URL = same server)
    if (!baseUrl) {
      return "";
    }
    
    // Remove trailing slash if present
    return baseUrl.replace(/\/$/, "");
  }
  
  /**
   * Build full API URL from path
   * @param path - API path like "/api/admin/signin"
   * @returns Full URL or relative path
   */
export function apiUrl(path: string): string {
    const baseUrl = getApiBaseUrl();
    
    // Ensure path starts with /
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    
    // If no base URL, return relative path
    if (!baseUrl) {
      return cleanPath;
    }
    
    // Return full URL
    return `${baseUrl}${cleanPath}`;
  }

type ApiFetchOptions = RequestInit & {
  skipAuth?: boolean
  skipAuthRedirect?: boolean
}

let refreshTokenCache: string | null = null
let refreshPromise: Promise<boolean> | null = null

export function setRefreshToken(token?: string | null) {
  refreshTokenCache = token ?? null
}

export function clearAuthCache() {
  refreshTokenCache = null
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) return {}
  if (headers instanceof Headers) {
    const result: Record<string, string> = {}
    headers.forEach((value, key) => {
      result[key] = value
    })
    return result
  }
  if (Array.isArray(headers)) {
    return headers.reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {})
  }
  return { ...headers }
}

async function refreshAccessToken(): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const body = refreshTokenCache
        ? JSON.stringify({ refreshToken: refreshTokenCache })
        : null
      const res = await fetch(apiUrl("/api/auth/v2/refresh"), {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ?? undefined,
        credentials: "include",
      })
      if (!res.ok) return false

      const data = await res.json().catch(() => null)
      if (data?.refreshToken) {
        refreshTokenCache = data.refreshToken as string
      }
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

async function performLogout() {
  try {
    await fetch(apiUrl("/api/auth/v2/logout"), {
      method: "POST",
      credentials: "include",
    })
  } catch {
    // Ignore logout errors; we still want to redirect.
  }
}

export function handleUnauthorized() {
  if (typeof window === "undefined") return
  clearAuthCache()
  void performLogout()
  if (window.location.pathname !== "/") {
    window.location.href = "/"
  } else {
    window.location.reload()
  }
}

export async function apiFetch(
  path: string,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const { skipAuth, skipAuthRedirect, headers, ...init } = options
  const normalizedHeaders = normalizeHeaders(headers)
  const requestInit: RequestInit = {
    ...init,
    headers: normalizedHeaders,
    credentials: init.credentials ?? "include",
  }

  const res = await fetch(apiUrl(path), requestInit)
  const isUnauthorized = res.status === 401 || res.status === 403
  const isRefreshEndpoint = path.includes("/api/auth/v2/refresh")

  if (!skipAuth && isUnauthorized && !isRefreshEndpoint) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      const retryRes = await fetch(apiUrl(path), requestInit)
      if (
        !skipAuthRedirect &&
        (retryRes.status === 401 || retryRes.status === 403)
      ) {
        handleUnauthorized()
      }
      return retryRes
    }
  }

  if (!skipAuthRedirect && isUnauthorized) {
    handleUnauthorized()
  }

  return res
}
