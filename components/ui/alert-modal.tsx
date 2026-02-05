"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type { ReactNode } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type AlertVariant = "success" | "error" | "warning" | "info"

type AlertOptions = {
  title?: string
  message?: string
  variant?: AlertVariant
  confirmText?: string
  cancelText?: string
}

type AlertState = AlertOptions & {
  mode: "alert" | "confirm"
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

const VARIANT_STYLES: Record<
  AlertVariant,
  { icon: typeof CheckCircle2; iconClass: string; ringClass: string }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-emerald-600",
    ringClass: "bg-emerald-50 ring-1 ring-emerald-100",
  },
  error: {
    icon: XCircle,
    iconClass: "text-red-600",
    ringClass: "bg-red-50 ring-1 ring-red-100",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-600",
    ringClass: "bg-amber-50 ring-1 ring-amber-100",
  },
  info: {
    icon: Info,
    iconClass: "text-sky-600",
    ringClass: "bg-sky-50 ring-1 ring-sky-100",
  },
}

export function AlertProvider({
  children,
}: {
  children: ReactNode
}) {
  const [state, setState] = useState<AlertState | null>(null)
  const resolverRef = useRef<(value: boolean) => void>()

  const close = useCallback((value: boolean) => {
    setState(null)
    if (resolverRef.current) {
      resolverRef.current(value)
      resolverRef.current = undefined
    }
  }, [])

  const open = useCallback(
    (mode: "alert" | "confirm", options: AlertOptions) =>
      new Promise<boolean>((resolve) => {
        resolverRef.current = resolve
        setState({
          mode,
          variant: options.variant ?? "info",
          title: options.title,
          message: options.message,
          confirmText: options.confirmText,
          cancelText: options.cancelText,
        })
      }),
    [],
  )

  const api = useMemo<AlertContextValue>(
    () => ({
      alert: async (options) => {
        await open("alert", options)
      },
      confirm: (options) => open("confirm", options),
    }),
    [open],
  )

  useEffect(() => {
    if (!state) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close(false)
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [state, close])

  const variant = state?.variant ?? "info"
  const title = state?.title ?? DEFAULT_TITLES[variant]
  const message = state?.message ?? ""
  const confirmText =
    state?.confirmText ?? (state?.mode === "confirm" ? "ยืนยัน" : "ตกลง")
  const cancelText = state?.cancelText ?? "ยกเลิก"
  const Icon = VARIANT_STYLES[variant].icon

  return (
    <AlertContext.Provider value={api}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => close(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="alert-title"
            aria-describedby="alert-message"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full",
                  VARIANT_STYLES[variant].ringClass,
                )}
              >
                <Icon
                  className={cn("h-6 w-6", VARIANT_STYLES[variant].iconClass)}
                />
              </div>
              <div className="flex-1 space-y-2">
                <div id="alert-title" className="text-lg font-semibold text-slate-900">
                  {title}
                </div>
                {message && (
                  <div
                    id="alert-message"
                    className="text-sm leading-relaxed text-slate-600"
                  >
                    {message}
                  </div>
                )}
              </div>
            </div>
            <div
              className={cn(
                "mt-6 flex items-center justify-end gap-2",
                state.mode === "alert" && "justify-end",
              )}
            >
              {state.mode === "confirm" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => close(false)}
                >
                  {cancelText}
                </Button>
              )}
              <Button
                type="button"
                variant={state.mode === "confirm" && variant === "warning" ? "destructive" : "default"}
                onClick={() => close(true)}
              >
                {confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
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
