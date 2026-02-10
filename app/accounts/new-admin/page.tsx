"use client"

import type { CSSProperties } from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
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
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function NewAdminPage() {
  const router = useRouter()
  const { alert } = useAlert()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [status, setStatus] = useState<"active" | "inactive">("active")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

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

      // ตรวจสอบอีเมลซ้ำกับ User_Account ก่อนเรียก signup
      try {
// Read token + set header
        const accessToken =
          typeof window !== "undefined"
            ? window.localStorage.getItem("accessToken")
            : null

        const headers: Record<string, string> = {}
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`
        }

        const listRes = await apiFetch("/api/admin/v1/users/list", {
          headers,
        })

        const listData = await listRes.json().catch(() => null)

        if (!listRes.ok) {
          const message =
            (listData && (listData.error as string | undefined)) ||
            "ไม่สามารถตรวจสอบอีเมลซ้ำกับระบบได้"
          setError(message)
          void alert({
            variant: "error",
            title: "เกิดข้อผิดพลาด",
            message,
          })
          setIsLoading(false)
          return
        }

        const accounts = (listData?.accounts ?? []) as {
          email?: string
        }[]

        const emailExists = accounts.some(
          (account) =>
            account.email &&
            account.email.toLowerCase() === email.toLowerCase(),
        )

        if (emailExists) {
          const message =
            "อีเมลนี้มีอยู่ในระบบแล้ว ไม่สามารถใช้ซ้ำได้"
          setError(message)
          void alert({
            variant: "error",
            title: "เกิดข้อผิดพลาด",
            message,
          })
          setIsLoading(false)
          return
        }
      } catch {
        const message = "ไม่สามารถตรวจสอบอีเมลซ้ำกับระบบได้"
        setError(message)
        void alert({
          variant: "error",
          title: "เกิดข้อผิดพลาด",
          message,
        })
        setIsLoading(false)
        return
      }

      const res = await apiFetch("/api/admin/v1/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          active: status === "active",
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error || "ไม่สามารถเพิ่มบัญชีผู้ดูแลระบบได้")
        return
      }

      router.push(`/otp?email=${encodeURIComponent(email)}`)
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
                      <Input
                        id="admin-email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Email"
                        required
                        disabled={isLoading}
                        className="h-11 rounded-full border-none bg-slate-200/80 px-4 text-sm text-slate-800 placeholder:text-slate-400"
                      />
                    </Field>
                    <Field>
                      <Input
                        id="admin-password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Password"
                        required
                        disabled={isLoading}
                        className="h-11 rounded-full border-none bg-slate-200/80 px-4 text-sm text-slate-800 placeholder:text-slate-400"
                      />
                    </Field>
                    <Field>
                      <Input
                        id="admin-confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        placeholder="Confirm Password"
                        required
                        disabled={isLoading}
                        className="h-11 rounded-full border-none bg-slate-200/80 px-4 text-sm text-slate-800 placeholder:text-slate-400"
                      />
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
                          <span>{status === "active" ? "ON" : "OFF"}</span>
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
