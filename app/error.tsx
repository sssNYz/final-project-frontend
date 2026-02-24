"use client"

import Link from "next/link"
import { useEffect } from "react"

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Unhandled application error", error)
  }, [error])

  return (
    <div className="flex min-h-svh items-center justify-center bg-sky-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          เกิดข้อผิดพลาดในแอปพลิเคชัน
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          กรุณาลองรีโหลดหน้าใหม่อีกครั้ง หากยังพบปัญหาเดิมให้ส่งข้อความใน
          Console มาเพื่อไล่สาเหตุต่อ
        </p>
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            ลองใหม่
          </button>
          <Link
            href="/"
            className="text-sm font-medium text-sky-700 hover:text-sky-900"
          >
            กลับหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  )
}
