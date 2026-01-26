// ... existing code at top ...
"use client"
import { apiUrl } from "@/lib/apiClient"
import { useState, useEffect, SetStateAction } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { GalleryVerticalEnd } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
      setError("Email is missing")
      return
    }

    // ตรวจสอบรูปแบบ OTP ต้องเป็นตัวเลข 6 หลัก
    if (otp.length !== 6) {
      setError("Code must be 6 digits")
      return
    }

    try {
      setIsLoading(true)
//เรียก API เพื่อยืนยัน OTP
      const res = await fetch(apiUrl("/api/admin/v1/verifyOtp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token: otp,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || "Verify failed")
        return
      }

      const supabaseUserId = data.user?.user?.id
      const accessToken = data.user?.session?.access_token

      if (!supabaseUserId || !accessToken) {
        setError("Invalid verify response")
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
      const syncRes = await fetch(apiUrl("/api/admin/v1/sync-admin"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(syncBody),
      })
// อ่านผลลัพธ์จากการ sync ข้อมูลแอดมิน
      const syncData = await syncRes.json().catch(() => null)
// ตรวจสอบผลลัพธ์การ sync ข้อมูลแอดมิน
      if (!syncRes.ok) {
        setError(syncData?.error || "Sync admin failed")
        return
      }
// นำผู้ใช้ไปยังหน้า Dashboard หลังยืนยัน OTP และ sync ข้อมูลสำเร็จ
      router.push("/dashboard")
    } catch (err) {
      setError("Network error")
    } finally {
      setIsLoading(false)
    }
  }
// เรนเดอร์ฟอร์มกรอกรหัส OTP
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <a
              href="#"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">Acme Inc.</span>
            </a>
            <h1 className="text-xl font-bold">Enter verification code</h1>
            <FieldDescription>
              We sent a 6-digit code to your email address
            </FieldDescription>
          </div>

          <Field>
            <FieldLabel htmlFor="otp" className="sr-only">
              Verification code
            </FieldLabel>
            
            <InputOTP
              maxLength={6}
              id="otp"
              required
              containerClassName="gap-4"
              value={otp}
              onChange={(value: SetStateAction<string>) => setOtp(value)}
            >
              <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:h-16 *:data-[slot=input-otp-slot]:w-12 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:text-xl">
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:h-16 *:data-[slot=input-otp-slot]:w-12 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border *:data-[slot=input-otp-slot]:text-xl">
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            <FieldDescription className="text-center">
              Didn&apos;t receive the code? <a href="#">Resend</a>
            </FieldDescription>
          </Field>

          {error && (
            <p className="text-red-500 text-sm text-center">
              {error}
            </p>
          )}

          <Field>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Verifying..." : "Verify"}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
// ... existing code ...
