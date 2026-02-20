"use client"

import type { CSSProperties } from "react"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { Eye, EyeOff } from "lucide-react"
import Swal from "sweetalert2"
import { useAlert } from "@/components/ui/alert-modal"

import { apiFetch } from "@/lib/apiClient"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

function NewAdminPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { alert } = useAlert()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [status, setStatus] = useState<"active" | "inactive">("active")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const successFlag = searchParams.get("success")

  useEffect(() => {
    if (successFlag !== "1") return
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setStatus("active")
    setError(null)
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("pendingRegister")
    }
    router.replace("/accounts/new-admin")
  }, [router, successFlag])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!email || !password || !confirmPassword) {
      setError("กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน")
      return
    }

    if (password !== confirmPassword) {
      setError("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน")
      return
    }

    if (password.length < 8) {
      setError("รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร")
      return
    }

    try {
      setIsLoading(true)

      const res = await apiFetch("/api/admin/v2/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
        }),
        skipAuthRedirect: true,
      })

      const data = await res.json().catch(() => null)
      const errorCode = String(data?.error ?? "").toLowerCase().trim()
      const errorMessage = String(data?.message ?? "").toLowerCase().trim()
      const errorText = `${errorCode} ${errorMessage}`.trim()
      if (errorCode === "email_exists" || errorText.includes("email_exists")) {
        await Swal.fire({
          icon: "error",
          title: "อีเมลซ้ำ",
          text: "อีเมลนี้มีอยู่แล้วในระบบ",
        })
        return
      }
      const shouldRedirectToOtp = [
        "not verified",
        "not_verified",
        "unverified",
        "verify",
        "verification",
        "otp",
        "pending",
      ].some((token) => errorText.includes(token))

      if (!res.ok && !shouldRedirectToOtp) {
        setError(data?.error || "ไม่สามารถเพิ่มบัญชีผู้ดูแลระบบได้")
        return
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "pendingRegister",
          JSON.stringify({ email, password }),
        )
      }
      const returnTo = encodeURIComponent("/accounts/new-admin?success=1")
      router.push(`/otp?email=${encodeURIComponent(email)}&returnTo=${returnTo}`)
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <SidebarProvider
      open
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 flex-col bg-slate-100">
          <div className="flex flex-1 items-center justify-center px-4 py-6 lg:px-6">
            <Card className="w-full max-w-md rounded-3xl border-none bg-slate-50 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-center text-xl font-bold text-slate-900">
                  เพิ่มบัญชีผู้ดูแลระบบ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <FieldGroup className="gap-4">
                    <Field>
                      <FieldTitle className="text-xs text-slate-600">
                        อีเมล
                      </FieldTitle>
                      <Input
                        id="admin-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="กรอกอีเมล"
                        required
                        disabled={isLoading}
                        className="h-11 rounded-full border-none bg-slate-200/80 px-4 text-sm text-slate-800 placeholder:text-slate-400"
                      />
                    </Field>
                    <Field>
                      <FieldTitle className="text-xs text-slate-600">
                        รหัสผ่าน
                      </FieldTitle>
                      <div className="relative">
                        <Input
                          id="admin-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="กรอกรหัสผ่าน"
                          required
                          disabled={isLoading}
                          className="h-11 rounded-full border-none bg-slate-200/80 px-4 pr-11 text-sm text-slate-800 placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          disabled={isLoading}
                          aria-label={
                            showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"
                          }
                          aria-pressed={showPassword}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700 disabled:opacity-50"
                        >
                          {showPassword ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </Field>
                    <Field>
                      <FieldTitle className="text-xs text-slate-600">
                        ยืนยันรหัสผ่าน
                      </FieldTitle>
                      <div className="relative">
                        <Input
                          id="admin-confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(event) =>
                            setConfirmPassword(event.target.value)
                          }
                          placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                          required
                          disabled={isLoading}
                          className="h-11 rounded-full border-none bg-slate-200/80 px-4 pr-11 text-sm text-slate-800 placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword((prev) => !prev)
                          }
                          disabled={isLoading}
                          aria-label={
                            showConfirmPassword
                              ? "ซ่อนรหัสผ่าน"
                              : "แสดงรหัสผ่าน"
                          }
                          aria-pressed={showConfirmPassword}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700 disabled:opacity-50"
                        >
                          {showConfirmPassword ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <FieldDescription className="mt-1 text-center text-[11px] text-slate-500">
                        รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร
                      </FieldDescription>
                    </Field>
                    <Field>
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="text-xs text-slate-600">
                          สถานะการใช้งาน
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setStatus((prev) =>
                              prev === "active" ? "inactive" : "active",
                            )
                          }
                          disabled={isLoading}
                          className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
                            status === "active"
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-red-500 bg-red-500 text-white"
                          }`}
                          aria-pressed={status === "active"}
                        >
                          <span>
                            {status === "active" ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                          </span>
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white">
                            <span
                              className={`h-3 w-3 rounded-full ${
                                status === "active"
                                  ? "bg-emerald-500"
                                  : "bg-red-500"
                              }`}
                            />
                          </span>
                        </button>
                      </div>
                    </Field>
                    {error && (
                      <p className="text-center text-sm text-red-500">
                        {error}
                      </p>
                    )}
                    <Field>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="mt-2 w-full rounded-full bg-slate-800 px-4 text-sm font-semibold text-white hover:bg-slate-900"
                      >
                        {isLoading
                          ? "กำลังเพิ่มบัญชีผู้ดูแลระบบ..."
                          : "เพิ่มบัญชีผู้ดูแลระบบ"}
                      </Button>
                    </Field>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function NewAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
          กำลังโหลด...
        </div>
      }
    >
      <NewAdminPageContent />
    </Suspense>
  )
}
