"use client"

import type { CSSProperties } from "react"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { useAlert } from "@/components/ui/alert-modal"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { apiFetch, apiUrl } from "@/lib/apiClient"

type RequestStatus = "PENDING" | "REJECTED" | "DONE"

type RequestCategory =
  | "PROBLEM"
  | "FUNCTION"
  | "NOTIFICATION"
  | "ADD_MEDICINE"
  | "OTHER"

type RequestRow = {
  id: string
  email: string
  category: RequestCategory
  status: RequestStatus
  submittedDate: string
  subject: string
  content: string
  imageUrl?: string
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: "รอดำเนินการ",
  REJECTED: "ปฏิเสธ",
  DONE: "ดำเนินการแล้ว",
}

const STATUS_BADGE_CLASSES: Record<RequestStatus, string> = {
  PENDING: "border-orange-400 bg-orange-100 text-orange-700",
  REJECTED: "border-red-400 bg-red-100 text-red-700",
  DONE: "border-emerald-500 bg-emerald-100 text-emerald-700",
}

const CATEGORY_LABELS: Record<RequestCategory, string> = {
  PROBLEM: "ปัญหาการใช้งาน",
  FUNCTION: "ฟังก์ชันการทำงาน",
  NOTIFICATION: "การแจ้งเตือน",
  ADD_MEDICINE: "คำร้องขอเพิ่มยา",
  OTHER: "อื่นๆ",
}

const initialRequests: RequestRow[] = []

function normalizeStatus(value?: string | null): RequestStatus {
  const normalized = (value ?? "").toLowerCase()
  if (normalized.includes("reject")) return "REJECTED"
  if (normalized.includes("complete") || normalized.includes("done")) {
    return "DONE"
  }
  return "PENDING"
}

function normalizeCategory(value?: string | null): RequestCategory {
  const raw = (value ?? "").trim()
  if (!raw) return "OTHER"
  const normalized = raw.toUpperCase().replace(/\s+/g, "_")
  if (
    normalized.includes("PROBLEM") ||
    normalized.includes("USAGE") ||
    normalized.includes("ISSUE")
  ) {
    return "PROBLEM"
  }
  if (normalized.includes("FUNCTION") || normalized.includes("FEATURE")) {
    return "FUNCTION"
  }
  if (normalized.includes("NOTIFICATION") || normalized.includes("ALERT")) {
    return "NOTIFICATION"
  }
  if (
    normalized.includes("ADD_MEDICINE") ||
    normalized.includes("ADD_DRUG") ||
    normalized.includes("MEDICINE") ||
    normalized.includes("DATA") ||
    normalized.includes("INFO")
  ) {
    return "ADD_MEDICINE"
  }
  return "OTHER"
}

function normalizeDate(value: unknown): string {
  if (!value) return ""
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === "number") {
    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? ""
      : date.toISOString().slice(0, 10)
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return ""
    const isoMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}/)
    if (isoMatch) return trimmed.slice(0, 10)
    const asNumber = Number(trimmed)
    if (!Number.isNaN(asNumber)) {
      const date = new Date(asNumber)
      return Number.isNaN(date.getTime())
        ? ""
        : date.toISOString().slice(0, 10)
    }
    const date = new Date(trimmed)
    return Number.isNaN(date.getTime())
      ? trimmed
      : date.toISOString().slice(0, 10)
  }
  return ""
}

function resolveImageUrl(value: unknown) {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const normalized = trimmed.replace(/^\/+/, "")
  return apiUrl(`/${normalized}`)
}

function formatDisplayDate(isoDate: string) {
  const [yearStr, monthStr, dayStr] = isoDate.split("-")
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)

  if (!year || !month || !day) return isoDate
  const thaiMonths = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ]
  const monthName = thaiMonths[month - 1]
  if (!monthName) return isoDate
  const buddhistYear = year + 543
  return `${day} ${monthName} ${buddhistYear}`
}

function RequestDetailPageContent() {
  const searchParams = useSearchParams()
  const [requests, setRequests] = useState<RequestRow[]>(initialRequests)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const { alert, confirm } = useAlert()

  useEffect(() => {
    async function fetchRequests() {
      try {
        setIsLoading(true)
        setLoadError(null)

        const res = await apiFetch("/api/admin/v1/user-request/list")
        const data = await res.json().catch(() => null)

        if (!res.ok) {
          setLoadError(
            (data && (data.error as string | undefined)) ||
              "โหลดคำร้องไม่สำเร็จ",
          )
          return
        }

        const items = (data?.requests ?? data?.items ?? data?.data ?? []) as Array<
          Record<string, unknown>
        >

        const mapped = items.map((item, index) => {
          const rawId =
            (item.id as string | number | undefined) ??
            (item.requestId as string | number | undefined) ??
            (item.request_id as string | number | undefined)
          const id = rawId ? String(rawId) : `REQ-${index + 1}`

          const userEmail =
            typeof item.user === "object" && item.user !== null
              ? (item.user as { email?: string }).email
              : undefined

          const email =
            (item.email as string | undefined) ??
            userEmail ??
            (item.userEmail as string | undefined) ??
            (item.senderEmail as string | undefined) ??
            ""

          const category = normalizeCategory(
            (item.category as string | undefined) ??
              (item.requestType as string | undefined) ??
              (item.type as string | undefined),
          )

          const status = normalizeStatus(
            (item.status as string | undefined) ??
              (item.requestStatus as string | undefined),
          )

          const submittedDate = normalizeDate(
            item.submittedDate ??
              item.createdAt ??
              item.created_at ??
              item.requestedAt,
          )

          const subject =
            (item.subject as string | undefined) ??
            (item.requestTitle as string | undefined) ??
            (item.title as string | undefined) ??
            "-"

          const content =
            (item.content as string | undefined) ??
            (item.requestDetails as string | undefined) ??
            (item.message as string | undefined) ??
            ""

          const imageUrl = resolveImageUrl(
            (item.picture as string | undefined) ??
              (item.imageUrl as string | undefined) ??
              (item.image_url as string | undefined) ??
              (item.attachmentUrl as string | undefined),
          )

          return {
            id,
            email,
            category,
            status,
            submittedDate,
            subject,
            content,
            imageUrl,
          } satisfies RequestRow
        })

        setRequests(mapped)
      } catch {
        setLoadError("เกิดข้อผิดพลาดในการโหลดคำร้อง")
      } finally {
        setIsLoading(false)
      }
    }

    fetchRequests()
  }, [])

  const requestIdFromQuery = useMemo(() => {
    const value = searchParams.get("requestId")
    return value ? value.trim() : ""
  }, [searchParams])

  const detailRequest = useMemo(() => {
    if (!requestIdFromQuery) return null
    return (
      requests.find((request) => request.id === requestIdFromQuery) ?? null
    )
  }, [requestIdFromQuery, requests])

  async function updateStatus(id: string, status: RequestStatus) {
    setLoadError(null)
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      const res = await apiFetch(
        `/api/admin/v1/user-request/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ status }),
        },
      )
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setLoadError(
          (data && (data.error as string | undefined)) ||
            "อัปเดตสถานะไม่สำเร็จ",
        )
        return false
      }

      setRequests((current) =>
        current.map((request) =>
          request.id === id ? { ...request, status } : request,
        ),
      )
      return true
    } catch {
      setLoadError("เกิดข้อผิดพลาดในการอัปเดตสถานะ")
      return false
    }
  }
  
// ตอบรับคำร้องหรือปฏิเสธคำร้องจากหน้ารายละเอียด
  async function resolveFromDetail(status: Exclude<RequestStatus, "PENDING">) {
    if (!detailRequest) return
    const confirmed = await confirm({
      variant: status === "DONE" ? "info" : "warning",
      title: status === "DONE" ? "ยืนยันการดำเนินการ" : "ยืนยันการปฏิเสธ",
      message:
        status === "DONE"
          ? "ยืนยันว่าจะดำเนินการคำร้องนี้หรือไม่?"
          : "ยืนยันว่าจะปฏิเสธคำร้องนี้หรือไม่?",
      confirmText: status === "DONE" ? "ยืนยัน" : "ปฏิเสธ",
      cancelText: "ยกเลิก",
      confirmButtonColor: status === "DONE" ? "#10b981" : "#ef4444",
    })
    if (!confirmed) return

    const ok = await updateStatus(detailRequest.id, status)
    if (ok) {
      await alert({
        variant: "success",
        title: "สำเร็จ",
        message:
          status === "DONE"
            ? "ตอบรับคำร้องสำเร็จ (ดำเนินการแล้ว)"
            : "ปฏิเสธคำร้องเรียบร้อยแล้ว",
      })
    }
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <main className="flex flex-1 flex-col bg-background">
          <DashboardPageHeader title="รายละเอียดคำร้อง" />
          <div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <a
                href="/requests"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                กลับหน้ารายการ
              </a>
              {requestIdFromQuery && (
                <span className="text-xs text-slate-500">
                  รหัสคำร้อง: {requestIdFromQuery}
                </span>
              )}
            </div>

            {loadError && <p className="text-sm text-red-500">{loadError}</p>}

            {isLoading && !detailRequest && (
              <div className="rounded-2xl border border-slate-900/10 bg-gradient-to-r from-slate-900 via-sky-800 to-sky-500 p-6 shadow-sm text-white">
                <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                <div className="mt-4 h-20 w-full animate-pulse rounded bg-slate-100" />
              </div>
            )}

            {detailRequest ? (
              <div className="flex justify-center">
                <div className="w-full max-w-3xl rounded-3xl border border-slate-900/10 bg-gradient-to-r from-slate-900 via-sky-800 to-sky-500 p-6 shadow-sm text-white">
                  <div className="mb-4 flex justify-center">
                    <span
                      className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold ${STATUS_BADGE_CLASSES[detailRequest.status]}`}
                    >
                      STATUS :{" "}
                      <span className="ml-1">
                        {STATUS_LABELS[detailRequest.status]}
                      </span>
                    </span>
                  </div>
                  <div className="space-y-3 rounded-2xl bg-white/10 p-4 text-xs">
                    <div className="space-y-2">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <div className="font-semibold">อีเมลผู้ส่งคำร้อง</div>
                          <div className="bg-white/10 px-4 py-2 text-[11px] font-medium text-white shadow-sm">
                            {detailRequest.email}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="font-semibold">วันที่ส่งคำร้อง</div>
                          <div className="bg-white/10 px-4 py-2 text-[11px] font-medium text-white shadow-sm">
                            {formatDisplayDate(detailRequest.submittedDate)}
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <div className="font-semibold">ชื่อหัวข้อ</div>
                          <div className="bg-white/10 px-4 py-2 text-[11px] font-medium text-white shadow-sm">
                            {detailRequest.subject || "-"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="font-semibold">หมวดหมู่คำร้อง</div>
                          <div className="bg-white/10 px-4 py-2 text-[11px] font-medium text-white shadow-sm">
                            {CATEGORY_LABELS[detailRequest.category]}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="font-semibold">เนื้อหาคำร้อง</div>
                        <div className="bg-white/10 px-4 py-3 text-[11px] text-white shadow-sm">
                          {detailRequest.content || "-"}
                        </div>
                      </div>
                    </div>
                    <div className="flex h-40 items-center justify-center rounded-xl bg-white/10">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedImage(
                            detailRequest.imageUrl && detailRequest.imageUrl.length > 0
                              ? detailRequest.imageUrl
                              : "/medicine-placeholder.svg",
                          )
                        }
                        className="flex h-full w-full cursor-zoom-in items-center justify-center"
                        aria-label="ขยายรูปคำร้อง"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            detailRequest.imageUrl && detailRequest.imageUrl.length > 0
                              ? detailRequest.imageUrl
                              : "/medicine-placeholder.svg"
                          }
                          alt="รูปประกอบคำร้อง"
                          className="h-full w-full max-w-[200px] object-contain"
                        />
                      </button>
                    </div>
                  </div>
                  {detailRequest.status === "PENDING" && (
                    <div className="mt-6 flex items-center justify-between gap-4">
                      <Button
                        type="button"
                        onClick={() => resolveFromDetail("REJECTED")}
                        className="flex-1 rounded-full bg-red-500 text-xs font-semibold text-white hover:bg-red-600"
                      >
                        ปฏิเสธ
                      </Button>
                      <Button
                        type="button"
                        onClick={() => resolveFromDetail("DONE")}
                        className="flex-1 rounded-full bg-emerald-500 text-xs font-semibold text-white hover:bg-emerald-600"
                      >
                        ดำเนินการแล้ว
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              !isLoading && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
                  ไม่พบรายละเอียดคำร้องที่ต้องการ
                </div>
              )
            )}
          </div>
        </main>
      </SidebarInset>

      {expandedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setExpandedImage(null)}
          role="presentation"
        >
          <div
            className="max-h-[90vh] max-w-[90vw] rounded-2xl bg-white p-3 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={expandedImage}
              alt="รูปคำร้องขยาย"
              className="max-h-[85vh] w-auto max-w-[85vw] object-contain"
            />
          </div>
        </div>
      )}
    </SidebarProvider>
  )
}

export default function RequestDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
          กำลังโหลด...
        </div>
      }
    >
      <RequestDetailPageContent />
    </Suspense>
  )
}
