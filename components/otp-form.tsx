// ... existing code at top ...
"use client"
import { apiFetch } from "@/lib/apiClient"
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

// ฟอร์มกรอกรหัส OTP และ sync ข้อมูลแอดมินหลังยืนยันสำเร็จ
export function OTPForm({ className, ...props }: React.ComponentProps<"div">) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get("email") || ""

  const [otp, setOtp] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!email) {
      router.push("/")
    }
  }, [email, router])

  // ตรวจสอบรูปแบบ OTP แล้วเรียก API verifyOtp และ sync-admin
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

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
      const res = await apiFetch("/api/admin/v1/verifyOtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token: otp,
        }),
        skipAuth: true,
        skipAuthRedirect: true,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || "ยืนยันรหัสไม่สำเร็จ")
        return
      }

      const supabaseUserId = data.user?.user?.id
      const accessToken = data.user?.session?.access_token

      if (!supabaseUserId || !accessToken) {
        setError("ข้อมูลยืนยันไม่ครบถ้วน")
        return
      }
// เตรียมข้อมูลสำหรับ sync-admin
      const syncBody = {
        supabaseUserId,
        email,
        provider: "email",
        allowMerge: false,
      }
// เรียก API เพื่อ sync ข้อมูลแอดมิน
      const syncRes = await apiFetch("/api/admin/v1/sync-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(syncBody),
        skipAuth: true,
        skipAuthRedirect: true,
      })
// อ่านผลลัพธ์จากการ sync ข้อมูลแอดมิน
      const syncData = await syncRes.json().catch(() => null)
// ตรวจสอบผลลัพธ์การ sync ข้อมูลแอดมิน
      if (!syncRes.ok) {
        setError(syncData?.error || "ซิงก์ข้อมูลผู้ดูแลไม่สำเร็จ")
        return
      }
// นำผู้ใช้ไปยังหน้า Dashboard หลังยืนยัน OTP และ sync ข้อมูลสำเร็จ
      router.push("/dashboard")
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ")
    } finally {
      setIsLoading(false)
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
                  <a
                    href="#"
                    className="font-semibold text-sky-300 hover:text-sky-200"
                  >
                    ส่งอีกครั้ง
                  </a>
                </FieldDescription>
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
