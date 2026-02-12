"use client"

import {
  createContext,
  useContext,
  useMemo,
} from "react"
import type { ReactNode } from "react"
import Swal from "sweetalert2"

type AlertVariant = "success" | "error" | "warning" | "info"

type AlertOptions = {
  title?: string
  message?: string
  variant?: AlertVariant
  confirmText?: string
  cancelText?: string
}

type AlertContextValue = {
  alert: (options: AlertOptions) => Promise<void>
  confirm: (options: AlertOptions) => Promise<boolean>
}

const AlertContext = createContext<AlertContextValue | null>(null)

const DEFAULT_TITLES: Record<AlertVariant, string> = {
  success: "สำเร็จ",
  error: "เกิดข้อผิดพลาด",
  warning: "ยืนยันการทำรายการ",
  info: "แจ้งเตือน",
}

function resolveTitle(options: AlertOptions) {
  const variant = options.variant ?? "info"
  return options.title ?? DEFAULT_TITLES[variant]
}

export function AlertProvider({
  children,
}: {
  children: ReactNode
}) {
  const api = useMemo<AlertContextValue>(
    () => ({
      alert: async (options) => {
        const variant = options.variant ?? "info"
        await Swal.fire({
          title: resolveTitle(options),
          text: options.message ?? "",
          icon: variant,
          confirmButtonText: options.confirmText ?? "ตกลง",
          confirmButtonColor: variant === "error" ? "#ef4444" : "#2563eb",
        })
      },
      confirm: async (options) => {
        const variant = options.variant ?? "warning"
        const result = await Swal.fire({
          title: resolveTitle({ ...options, variant }),
          text: options.message ?? "",
          icon: variant,
          showCancelButton: true,
          confirmButtonText: options.confirmText ?? "ยืนยัน",
          cancelButtonText: options.cancelText ?? "ยกเลิก",
          confirmButtonColor: "#ef4444",
          cancelButtonColor: "#94a3b8",
        })
        return result.isConfirmed
      },
    }),
    [],
  )

  return (
    <AlertContext.Provider value={api}>
      {children}
    </AlertContext.Provider>
  )
}

export function useAlert() {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error("useAlert must be used within AlertProvider")
  }
  return context
}
