import { LoginForm } from "@/components/login-form"

// หน้า /login สำหรับให้แอดมินเข้าระบบ
export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-slate-100 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}
