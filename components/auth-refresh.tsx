"use client"

import { useEffect, useRef } from "react"

import { apiFetch } from "@/lib/apiClient"

const REFRESH_INTERVAL_MS = 10 * 60 * 1000

export function AuthRefresh() {
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const refresh = async () => {
      if (cancelled) return
      await apiFetch("/api/auth/v2/refresh", {
        method: "POST",
        skipAuth: true,
        skipAuthRedirect: true,
      })
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
  }, [])

  return null
}
