"use client"
import { apiFetch, setRefreshToken } from "@/lib/apiClient"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, Lock, User } from "lucide-react"
// ฟอร์มล็อกอินสำหรับแอดมิน โดยมีการจัดการสถานะของฟอร์มและการเรียก API เพื่อเข้าสู่ระบบ
import { setLoggedInUserEmail } from "@/lib/authUser"
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

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // จัดการ submit ฟอร์มล็อกอิน และนำผู้ใช้ไปหน้า Dashboard
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError("กรุณากรอกอีเมลและรหัสผ่าน")
      return
    }

    try {
      setIsLoading(true)
      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC"
// เรียก API เพื่อขอล็อกอิน
      const res = await apiFetch("/api/auth/v2/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, timezone }),
        skipAuth: true,
        skipAuthRedirect: true,
      })
// อ่านผลลัพธ์จาก API
      const data = await res.json().catch(() => null)
// ตรวจสอบผลลัพธ์การล็อกอิน
      if (!res.ok) {
        const errorCode = (data?.error as string | undefined) ?? ""
        if (errorCode === "INVALID_CREDENTIALS") {
          setError("รหัสผ่านหรืออีเมลไม่ถูกต้อง")
        } else if (errorCode === "ACCOUNT_BANNED") {
          setError("บัญชีของคุณถูกปิดการใช้งาน")
        } else {
          setError(errorCode || "เข้าสู่ระบบไม่สำเร็จ")
        }
        return
      }
      const refreshToken =
        (data?.refreshToken as string | undefined) ??
        (data?.tokens?.refreshToken as string | undefined) ??
        (data?.data?.refreshToken as string | undefined)
      if (refreshToken) {
        setRefreshToken(refreshToken)
      }
      // เก็บอีเมลของผู้ใช้ใน sessionStorage เพื่อใช้ในการตรวจสอบสถานะการเข้าสู่ระบบ
      if (typeof window !== "undefined") {
        const userEmail =
          (data?.user?.email as string | undefined) ?? email
        if (userEmail) {
          window.sessionStorage.setItem("currentUserEmail", userEmail)
          // นอกจากนี้ยังเก็บในคุกกี้หรือที่อื่นๆ ตามที่ระบบของคุณต้องการ
          setLoggedInUserEmail(userEmail)
        }
      }
// นำผู้ใช้ไปยังหน้า Dashboard
      router.push("/dashboard")
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }
// เรนเดอร์ฟอร์มล็อกอิน
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        className,
      )}
      {...props}
    >
      <Card className="w-full max-w-md rounded-3xl border border-sky-400/30 bg-gradient-to-br from-slate-900/95 via-slate-900/85 to-sky-900/80 shadow-2xl shadow-sky-500/20 backdrop-blur-2xl">
        <CardHeader className="pb-6">
          <CardTitle className="text-center text-2xl font-bold text-white">
            เข้าสู่ระบบผู้ดูแลระบบ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <FieldGroup className="space-y-2">
              <Field>
                <FieldLabel htmlFor="email" className="text-xs text-white/70">
                  อีเมล
                </FieldLabel>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="กรอกอีเมล"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="h-11 rounded-full border border-white/15 bg-white/10 px-4 pl-11 text-sm text-white placeholder:text-white/50 focus-visible:ring-2 focus-visible:ring-sky-400"
                  />
                </div>
              </Field>
              <Field>
                <FieldLabel
                  htmlFor="password"
                  className="text-xs text-white/70"
                >
                  รหัสผ่าน
                </FieldLabel>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="กรอกรหัสผ่าน"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-11 rounded-full border border-white/15 bg-white/10 px-4 pl-11 pr-11 text-sm text-white placeholder:text-white/50 focus-visible:ring-2 focus-visible:ring-sky-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                    aria-label={
                      showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"
                    }
                    aria-pressed={showPassword}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="mt-2 flex justify-end">
                  <Link href="/forgot-password"
                    className="text-xs font-semibold text-sky-200 hover:text-white">
                    ลืมรหัสผ่าน?
                  </Link>
                </div>
              </Field>

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
                  {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
