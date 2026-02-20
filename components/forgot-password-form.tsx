"use client"

import { useState } from "react"
import Link from "next/link"
import { Mail } from "lucide-react"

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

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setNotice(null)

    if (!email) {
      setError("กรุณากรอกอีเมล")
      return
    }

    try {
      setIsLoading(true)
      const res = await apiFetch("/api/auth/v2/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        skipAuth: true,
        skipAuthRedirect: true,
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(
          (data && (data.error as string | undefined)) ||
            "ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้",
        )
        return
      }
      setNotice("ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว")
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
            ลืมรหัสผ่าน
          </CardTitle>
          <p className="text-sm text-white/70">
            กรอกอีเมลเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <FieldGroup className="space-y-2">
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
                  {isLoading ? "กำลังส่ง..." : "ส่งลิงก์รีเซ็ต"}
                </Button>
              </Field>
            </FieldGroup>
          </form>

          <div className="mt-4 text-center">
            <Link
              href="/"
              className="text-xs font-semibold text-sky-200 hover:text-white"
            >
              กลับไปหน้าเข้าสู่ระบบ
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
