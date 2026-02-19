// ... existing code at top ...
"use client"
import { apiFetch, setRefreshToken } from "@/lib/apiClient"
import { useState, useEffect, SetStateAction } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
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
  FieldLabel,
} from "@/components/ui/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"

// ฟอร์มกรอกรหัส OTP สำหรับยืนยันตัวตน
export function OTPForm({ className, ...props }: React.ComponentProps<"div">) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get("email") || ""
  const returnToParam = searchParams.get("returnTo") || ""
  const safeReturnTo = returnToParam.startsWith("/") ? returnToParam : ""
  const isAdminFlow = Boolean(safeReturnTo)

  const [otp, setOtp] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (!email) {
      router.push("/")
    }
  }, [email, router])

  // ตรวจสอบรูปแบบ OTP แล้วเรียก API ยืนยัน OTP
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setNotice(null)

    // ตรวจสอบค่า email และ otp 
    if (!email) {
      setError("ไม่พบอีเมลสำหรับยืนยันตัวตน")
      return
    }

    // ตรวจสอบรูปแบบ OTP ต้องเป็นตัวเลข 6 หลัก
    if (otp.length !== 6) {
      setError("กรอกรหัสให้ครบ 6 หลัก")
      return
    }

    try {
      setIsLoading(true)
//เรียก API เพื่อยืนยัน OTP
      const res = await apiFetch("/api/auth/v2/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code: otp,
        }),
        skipAuth: true,
        skipAuthRedirect: true,
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setError(data?.error || "ยืนยันรหัสไม่สำเร็จ")
        return
      }
      if (!isAdminFlow) {
        const refreshToken =
          (data?.refreshToken as string | undefined) ??
          (data?.tokens?.refreshToken as string | undefined) ??
          (data?.data?.refreshToken as string | undefined)
        if (refreshToken) {
          setRefreshToken(refreshToken)
        }
        if (typeof window !== "undefined") {
          const userEmail =
            (data?.user?.email as string | undefined) ?? email
          if (userEmail) {
            window.sessionStorage.setItem("currentUserEmail", userEmail)
          }
        }
      }
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("pendingRegister")
      }
      const destination = safeReturnTo || "/dashboard"
      router.push(destination)
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResend() {
    setError(null)
    setNotice(null)

    if (!email) {
      setError("ไม่พบอีเมลสำหรับส่งรหัสยืนยันอีกครั้ง")
      return
    }

    if (typeof window === "undefined") {
      setError("ไม่สามารถส่งรหัสยืนยันได้ในขณะนี้")
      return
    }

    const pending = window.sessionStorage.getItem("pendingRegister")
    if (!pending) {
      setError("ไม่พบข้อมูลสำหรับส่งรหัสยืนยันอีกครั้ง")
      return
    }

    let payload: { email?: string; password?: string } | null = null
    try {
      payload = JSON.parse(pending) as { email?: string; password?: string }
    } catch {
      payload = null
    }

    if (!payload?.email || !payload?.password) {
      setError("ไม่พบข้อมูลสำหรับส่งรหัสยืนยันอีกครั้ง")
      return
    }

    if (payload.email !== email) {
      setError("อีเมลสำหรับส่งรหัสยืนยันไม่ตรงกัน")
      return
    }

    try {
      setIsResending(true)
      const registerEndpoint = isAdminFlow
        ? "/api/admin/v2/admins"
        : "/api/auth/v2/register"
      const res = await apiFetch(registerEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
        }),
        skipAuth: true,
        skipAuthRedirect: true,
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error || "ส่งรหัสยืนยันอีกครั้งไม่สำเร็จ")
        return
      }
      setNotice("ส่งรหัสยืนยันใหม่แล้ว โปรดตรวจสอบอีเมล")
    } catch {
      setError("เกิดข้อผิดพลาดในการส่งรหัสยืนยันอีกครั้ง")
    } finally {
      setIsResending(false)
    }
  }
// เรนเดอร์ฟอร์มกรอกรหัส OTP
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="rounded-3xl border border-sky-400/30 bg-gradient-to-br from-slate-900/95 via-slate-900/85 to-sky-900/80 shadow-2xl shadow-sky-500/20 backdrop-blur-2xl">
        <CardHeader className="pb-5 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white shadow-inner">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <CardTitle className="mt-4 text-2xl font-bold text-white">
            ยืนยันรหัส OTP
          </CardTitle>
          <p className="text-sm text-white/70">
            เราส่งรหัส 6 หลักไปที่{" "}
            <span className="font-semibold text-white">
              {email || "อีเมลของคุณ"}
            </span>
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <FieldGroup className="space-y-2">
              <Field>
                <FieldLabel htmlFor="otp" className="sr-only">
                  รหัสยืนยัน
                </FieldLabel>
                <InputOTP
                  maxLength={6}
                  id="otp"
                  required
                  containerClassName="gap-3 justify-center"
                  value={otp}
                  onChange={(value: SetStateAction<string>) => setOtp(value)}
                >
                  <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:h-14 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:rounded-xl *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:border-white/20 *:data-[slot=input-otp-slot]:bg-white/10 *:data-[slot=input-otp-slot]:text-lg *:data-[slot=input-otp-slot]:text-white *:data-[slot=input-otp-slot]:shadow-inner">
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator className="text-white/60" />
                  <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:h-14 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:rounded-xl *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:border-white/20 *:data-[slot=input-otp-slot]:bg-white/10 *:data-[slot=input-otp-slot]:text-lg *:data-[slot=input-otp-slot]:text-white *:data-[slot=input-otp-slot]:shadow-inner">
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <FieldDescription className="text-center text-xs text-white/60">
                  ไม่ได้รับรหัส?{" "}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="font-semibold text-sky-300 hover:text-sky-200 disabled:cursor-not-allowed disabled:text-sky-300/60"
                  >
                    {isResending ? "กำลังส่ง..." : "ส่งอีกครั้ง"}
                  </button>
                </FieldDescription>
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
                  {isLoading ? "กำลังตรวจสอบ..." : "ยืนยันรหัส"}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
// ... existing code ...

