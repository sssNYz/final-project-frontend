import { ForgotPasswordForm } from "@/components/forgot-password-form"

// หน้า /forgot-password สำหรับขอรีเซ็ตรหัสผ่าน
export default function ForgotPasswordPage() {
  return (
    <div className="relative min-h-svh w-full overflow-hidden bg-sky-50 text-slate-900">
      <div className="absolute inset-0 bg-[url('/assets/login-bg.png')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100/30 via-sky-50/50 to-white/80" />
      <div className="absolute -left-24 bottom-[-120px] h-72 w-72 rounded-full bg-white/50 blur-2xl" />
      <div className="absolute right-[-120px] top-6 h-64 w-64 rounded-full bg-sky-200/50 blur-3xl" />
      <div className="absolute left-1/3 top-8 h-24 w-24 rounded-full bg-white/70 blur-2xl" />

      <div className="relative z-10 flex min-h-svh w-full items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  )
}
