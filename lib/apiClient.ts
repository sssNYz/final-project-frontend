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

function hasAuthorizationHeader(headers: Record<string, string>): boolean {
  return Object.keys(headers).some(
    (key) => key.toLowerCase() === "authorization",
  )
}

function clearAuthStorage() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem("accessToken")
  window.localStorage.removeItem("refreshToken")
  window.localStorage.removeItem("currentUserEmail")
}

export function handleUnauthorized() {
  if (typeof window === "undefined") return
  clearAuthStorage()
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

  if (!skipAuth && typeof window !== "undefined") {
    const token = window.localStorage.getItem("accessToken")
    if (token && !hasAuthorizationHeader(normalizedHeaders)) {
      normalizedHeaders.Authorization = `Bearer ${token}`
    }
  }

  const res = await fetch(apiUrl(path), {
    ...init,
    headers: normalizedHeaders,
  })

  if (!skipAuthRedirect && (res.status === 401 || res.status === 403)) {
    handleUnauthorized()
  }

  return res
}
