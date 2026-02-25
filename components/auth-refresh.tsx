"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

import { apiFetch, handleUnauthorized } from "@/lib/apiClient"
import { getLoggedInUserEmail } from "@/lib/authUser"

const REFRESH_INTERVAL_MS = 14 * 60 * 1000
const PUBLIC_PATHS = new Set(["/", "/forgot-password", "/reset"])

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname)
}
// ฟังก์ชันตรวจสอบว่ามีการรีเฟรชโทเค็นอยู่แล้วหรือไม่ เพื่อป้องกันการเรียกซ้ำซ้อน
function hasActiveClientSession(): boolean {
  if (typeof window === "undefined") return false
  const sessionEmail = window.sessionStorage.getItem("currentUserEmail")
  // ถ้า sessionEmail มีค่าและไม่ใช่แค่ช่องว่าง ให้ถือว่ามีเซสชันที่ใช้งานอยู่
  return Boolean(sessionEmail?.trim() || getLoggedInUserEmail())
}
// ฟังก์ชันนี้จะถูกเรียกเมื่อได้รับการตอบกลับ 401 Unauthorized เพื่อจัดการกับสถานะการเข้าสู่ระบบที่หมดอายุ
export function AuthRefresh() {
  const pathname = usePathname()
  const timerRef = useRef<number | null>(null)

// ใช้ useEffect เพื่อจัดการกับการรีเฟรชโทเค็นเมื่อคอมโพเนนต์ถูกติดตั้งและเมื่อเส้นทางเปลี่ยนแปลง
  useEffect(() => {
    let cancelled = false
    // ฟังก์ชันรีเฟรชโทเค็นที่จะถูกเรียกทั้งเมื่อคอมโพเนนต์ถูกติดตั้งและเมื่อผู้ใช้กลับมาที่หน้าเว็บ
    const refresh = async () => {
      if (cancelled) return
      const isPublic = isPublicPath(pathname)
      const res = await apiFetch("/api/auth/v2/refresh", {
        method: "POST",
        skipAuth: true,
        skipAuthRedirect: true,
      })

      if (isPublic) return

      if (!res.ok) {
        handleUnauthorized()
        return
      }

      if (!hasActiveClientSession()) {
        const cookieEmail = getLoggedInUserEmail()
        if (cookieEmail && typeof window !== "undefined") {
          window.sessionStorage.setItem("currentUserEmail", cookieEmail)
          return
        }
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
