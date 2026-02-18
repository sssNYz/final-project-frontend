import Image from "next/image"

import { LoginForm } from "@/components/login-form"

// หน้าแรกของระบบ แสดงฟอร์มล็อกอินหลัก
export default function Page() {
  return (
    <div className="relative min-h-svh w-full overflow-hidden bg-sky-50 text-slate-900">
      <div className="absolute inset-0 bg-[url('/assets/login-bg.png')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-gradient-to-b from-sky-100/30 via-sky-50/50 to-white/80" />
      <div className="absolute -left-24 bottom-[-120px] h-72 w-72 rounded-full bg-white/50 blur-2xl" />
      <div className="absolute right-[-120px] top-6 h-64 w-64 rounded-full bg-sky-200/50 blur-3xl" />
      <div className="absolute left-1/3 top-8 h-24 w-24 rounded-full bg-white/70 blur-2xl" />

      <div className="relative z-10 mx-auto grid min-h-svh w-full max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-60 w-60 items-center justify-center rounded-full bg-white/85 shadow-xl ring-2 ring-white/70">
            <Image
              src="/assets/Icon_MediBuddy.png"
              alt="MediBuddy"
              width={1000}
              height={1000}
              className="h-60 w-60 object-contain"
            />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
              MediBuddy
            </div>
            <h1 className="text-4xl font-extrabold tracking-wide text-sky-500 drop-shadow-sm sm:text-5xl">
              MEDICINE ADMIN
            </h1>
          </div>
          <p className="max-w-xl text-sm text-slate-600 sm:text-base">
            ระบบจัดการข้อมูลยาและผู้ใช้งาน สำหรับแอดมินของ MediBuddy
          </p>
        </div>

        <div className="flex w-full items-center justify-center lg:justify-end">
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  )
}
