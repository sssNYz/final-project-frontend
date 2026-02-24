"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, Mail } from "lucide-react"
import { useRouter } from "next/navigation"

import { apiFetch } from "@/lib/apiClient"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type ForgotPasswordFlow = "request" | "reset"

export function ForgotPasswordForm({
  flow = "request",
  className,
  ...props
}: React.ComponentProps<"div"> & { flow?: ForgotPasswordFlow }) {
  const defaultRedirectTo = "https://admin.medi-buddy.xyz/forgot-password/reset"
  const [email, setEmail] = useState("")
  const [token, setToken] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const forgotEmailStorageKey = "forgotPasswordEmail"
  const isResetFlow = flow === "reset"

  useEffect(() => {
    if (!isResetFlow) return
    if (typeof window === "undefined") return

    const searchParams = new URLSearchParams(window.location.search)
    const currentToken = searchParams.get("token") ?? ""
    const emailFromQuery = searchParams.get("email") ?? ""
    const emailFromStorage = window.sessionStorage.getItem(forgotEmailStorageKey) ?? ""
    setToken(currentToken)
    if (emailFromQuery) {
      setEmail(emailFromQuery)
    } else if (emailFromStorage) {
      setEmail(emailFromStorage)
    }
  }, [isResetFlow])

  const backendErrorMessage = useMemo(
    () => (data: unknown) => {
      if (!data || typeof data !== "object") return null
      const payload = data as Record<string, unknown>
      return (
        (payload.error as string | undefined) ||
        (payload.message as string | undefined) ||
        (payload.detail as string | undefined) ||
        null
      )
    },
    [],
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setNotice(null)

    if (!isResetFlow) {
      if (!email) {
        setError("กรุณากรอกอีเมล")
        return
      }
    } else {
      if (!token) {
        setError("ไม่พบโทเค็นรีเซ็ตรหัสผ่าน")
        return
      }
      if (!newPassword || !confirmPassword) {
        setError("กรุณากรอกรหัสผ่านใหม่ให้ครบ")
        return
      }
      if (newPassword.length < 8) {
        setError("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร")
        return
      }
      if (newPassword !== confirmPassword) {
        setError("รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน")
        return
      }
    }

    try {
      setIsLoading(true)
      const res =
        !isResetFlow
          ? await apiFetch("/api/auth/v2/forgot-password/request", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email,
                redirectTo:
                  process.env.NEXT_PUBLIC_FORGOT_PASSWORD_REDIRECT_TO ||
                  defaultRedirectTo,
              }),
              skipAuth: true,
              skipAuthRedirect: true,
            })
          : await apiFetch("/api/auth/v2/forgot-password/reset", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token,
                newPassword,
              }),
              skipAuth: true,
              skipAuthRedirect: true,
            })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        if (!isResetFlow && res.status === 404) {
          setError("Email not found in our system.")
          return
        }
        setError(
          backendErrorMessage(data) ||
            (!isResetFlow
              ? "ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้"
              : "ไม่สามารถเปลี่ยนรหัสผ่านได้"),
        )
        return
      }
      if (!isResetFlow) {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(forgotEmailStorageKey, email)
        }
        setNotice("A password reset link has been sent to your email.")
        return
      }

      setNotice("เปลี่ยนรหัสผ่านสำเร็จ กำลังกลับไปหน้าเข้าสู่ระบบ...")
      setTimeout(() => {
        router.push("/")
      }, 1200)
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        className,
      )}
      {...props}
    >
      <Card className="w-full max-w-md rounded-3xl border border-sky-400/30 bg-gradient-to-br from-slate-900/95 via-slate-900/85 to-sky-900/80 shadow-2xl shadow-sky-500/20 backdrop-blur-2xl">
        <CardHeader className="pb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white shadow-inner">
            <Mail className="h-5 w-5" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold text-white">
            {isResetFlow ? "ตั้งรหัสผ่านใหม่" : "ลืมรหัสผ่าน"}
          </CardTitle>
          <p className="text-sm text-white/70">
            {!isResetFlow
              ? "กรอกอีเมลเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่"
              : "กรอกรหัสผ่านใหม่ที่ต้องการใช้"}
          </p>      
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <FieldGroup className="space-y-2">
              {!isResetFlow ? (
                <Field>
                  <FieldLabel htmlFor="email" className="text-xs text-white/70">
                    อีเมล
                  </FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="กรอกอีเมล"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="h-11 rounded-full border border-white/15 bg-white/10 px-4 text-sm text-white placeholder:text-white/50 focus-visible:ring-2 focus-visible:ring-sky-400"
                  />
                </Field>
              ) : (
                <>
                  <Field>
                    <FieldLabel htmlFor="new-password" className="text-xs text-white/70">
                      รหัสผ่านใหม่
                    </FieldLabel>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="อย่างน้อย 8 ตัวอักษร"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isLoading}
                        className="h-11 rounded-full border border-white/15 bg-white/10 px-4 pr-11 text-sm text-white placeholder:text-white/50 focus-visible:ring-2 focus-visible:ring-sky-400"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowNewPassword((prev) => !prev)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                        aria-label={
                          showNewPassword ? "ซ่อนรหัสผ่านใหม่" : "แสดงรหัสผ่านใหม่"
                        }
                        aria-pressed={showNewPassword}
                        disabled={isLoading}
                      >
                        {showNewPassword ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </Field>
                  <Field>
                    <FieldLabel
                      htmlFor="confirm-password"
                      className="text-xs text-white/70"
                    >
                      ยืนยันรหัสผ่านใหม่
                    </FieldLabel>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="กรอกรหัสผ่านเดิมอีกครั้ง"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                        className="h-11 rounded-full border border-white/15 bg-white/10 px-4 pr-11 text-sm text-white placeholder:text-white/50 focus-visible:ring-2 focus-visible:ring-sky-400"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword((prev) => !prev)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                        aria-label={
                          showConfirmPassword
                            ? "ซ่อนยืนยันรหัสผ่านใหม่"
                            : "แสดงยืนยันรหัสผ่านใหม่"
                        }
                        aria-pressed={showConfirmPassword}
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </Field>
                </>
              )}

              {notice && (
                <p className="text-center text-sm text-emerald-200">
                  {notice}
                </p>
              )}
              {error && (
                <p className="text-center text-sm text-rose-300">
                  {error}
                </p>
              )}

              <Field>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 w-full rounded-full bg-sky-500 px-4 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-600"
                >
                  {isLoading
                    ? "กำลังดำเนินการ..."
                    : !isResetFlow
                      ? "ส่งลิงก์รีเซ็ต"
                      : "บันทึกรหัสผ่านใหม่"}
                </Button>
              </Field>
            </FieldGroup>
          </form>

          <div className="mt-4 text-center">
            <Link
              href={isResetFlow ? "/forgot-password" : "/"}
              className="text-xs font-semibold text-sky-200 hover:text-white"
            >
              {isResetFlow ? "กลับไปหน้าขอรีเซ็ต" : "กลับไปหน้าเข้าสู่ระบบ"}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
