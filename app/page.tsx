import { LoginForm } from "@/components/login-form"

// หน้าแรกของระบบ แสดงฟอร์มล็อกอินหลัก
export default function Page() {
  return (
    <div className="relative min-h-svh w-full overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[url('/assets/login-bg.png')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-slate-950/65" />
      <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-6xl flex-col items-center justify-center gap-10 px-6 py-12 text-white lg:flex-row lg:items-center lg:justify-between">
        <div className="flex max-w-xl flex-col gap-4 text-center lg:text-left">
          <div className="inline-flex items-center justify-center gap-3 lg:justify-start">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/40">
              <span className="text-2xl font-semibold">+</span>
            </span>
            <div className="text-left">
              <div className="text-2xl font-semibold uppercase tracking-[0.2em] text-white/90">
                MediBuddy
              </div>
              <div className="text-sm font-medium text-white/70">
                Medication Management Console
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-semibold leading-tight text-white lg:text-4xl">
            MEDICINE ADMIN
          </h1>
          <p className="text-sm text-white/70 lg:text-base">
            ระบบจัดการข้อมูลยาและผู้ใช้งานแบบมืออาชีพ ปลอดภัย
            ทันสมัย พร้อมใช้งานในคลินิกและโรงพยาบาล
          </p>
        </div>
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
