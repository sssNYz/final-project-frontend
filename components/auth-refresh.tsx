"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

import { apiFetch, handleUnauthorized } from "@/lib/apiClient"

const REFRESH_INTERVAL_MS = 14 * 60 * 1000
const PUBLIC_PATHS = new Set(["/", "/forgot-password", "/reset", "/otp"])

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname)
}

export function AuthRefresh() {
  const pathname = usePathname()
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const refresh = async () => {
      if (cancelled) return
      const res = await apiFetch("/api/auth/v2/refresh", {
        method: "POST",
        skipAuth: true,
        skipAuthRedirect: true,
      })
      if (!res.ok && !isPublicPath(pathname)) {
        handleUnauthorized()
      }
    }

    void refresh()

    timerRef.current = window.setInterval(() => {
      void refresh()
    }, REFRESH_INTERVAL_MS)

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh()
      }
    }

    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      cancelled = true
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }
      window.removeEventListener("focus", refresh)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [pathname])

  return null
}
