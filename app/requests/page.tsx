"use client"

import type { CSSProperties } from "react"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"

import {
  Calendar as CalendarIcon,
  Clock,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SearchButton } from "@/components/ui/search-button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  PENDING:
    "border-orange-400 bg-orange-100 text-orange-700",
  REJECTED: "border-red-400 bg-red-100 text-red-700",
  DONE:
    "border-emerald-500 bg-emerald-100 text-emerald-700",
}

const CATEGORY_LABELS: Record<RequestCategory, string> = {
  PROBLEM: "ปัญหาการใช้งาน",
  FUNCTION: "ฟังก์ชันการทำงาน",
  NOTIFICATION: "การแจ้งเตือน",
  ADD_MEDICINE: "คำร้องขอเพิ่มยา",
  OTHER: "อื่นๆ",
}

const PAGE_SIZE = 5

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

// หน้า Dashboard > รายการคำร้องจากผู้ใช้
// แสดงตารางรายการคำร้อง พร้อมตัวกรองและสถานะคำร้อง
function resolveImageUrl(value: unknown) {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined // ถ้าเป็นค่าว่างให้คืนค่า undefined
  if (/^https?:\/\//i.test(trimmed)) return trimmed   // ตรวจสอบว่าเป็น URL เต็มรูปแบบหรือไม่
  const normalized = trimmed.replace(/^\/+/, "") // ลบ / ข้างหน้าออก
  return apiUrl(`/${normalized}`) 
}

// ฟอร์แมตวันที่เป็นรูปแบบวันที่ภาษาไทย
function formatDisplayDate(isoDate: string) {
  const [yearStr, monthStr, dayStr] = isoDate.split("-")
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  // ตรวจสอบความถูกต้องของวันที่

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
// แปลงเดือนเป็นชื่อเดือน
  const monthName = thaiMonths[month - 1]
  if (!monthName) return isoDate
// คำนวณปีพุทธศักราช
  const buddhistYear = year + 543
  return `${day} ${monthName} ${buddhistYear}`
}

// คอมโพเนนต์หลักของหน้ารายการคำร้องใน Dashboard
function RequestsPageContent() {
  const searchParams = useSearchParams()
  const [requests, setRequests] =
    useState<RequestRow[]>(initialRequests)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | RequestCategory
  >("all")
  const [statusFilter, setStatusFilter] = useState<
    "all" | RequestStatus
  >("all")
  const [searchEmail, setSearchEmail] = useState("")
  const [fromDate, setFromDate] =
    useState<Date | undefined>(undefined)
  const [toDate, setToDate] =
    useState<Date | undefined>(undefined)
  const [categoryFilterInput, setCategoryFilterInput] =
    useState<"all" | RequestCategory>("all")
  const [statusFilterInput, setStatusFilterInput] =
    useState<"all" | RequestStatus>("all")
  const [searchEmailInput, setSearchEmailInput] =
    useState("")
  const [fromDateInput, setFromDateInput] =
    useState<Date | undefined>(undefined)
  const [toDateInput, setToDateInput] =
    useState<Date | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

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

        const items = (data?.requests ??
          data?.items ??
          data?.data ??
          []) as Array<Record<string, unknown>>

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
      requests.find((request) => request.id === requestIdFromQuery) ??
      null
    )
  }, [requestIdFromQuery, requests])

  const isDetailView = Boolean(requestIdFromQuery)

  // ตั้งค่า default ให้ช่วงวันที่เป็นวันที่เก่าที่สุดและใหม่ที่สุดจากรายการคำร้อง
  useEffect(() => {
    if (!requests.length) return
    if (fromDateInput || toDateInput) return

    const timestamps = requests
      .map((request) => new Date(request.submittedDate).getTime())
      .filter((time) => !Number.isNaN(time))

    if (!timestamps.length) return

    const minTime = Math.min(...timestamps)
    const maxTime = Math.max(...timestamps)

    const minDate = new Date(minTime)
    const maxDate = new Date(maxTime)

    setFromDate(minDate)
    setFromDateInput(minDate)
    setToDate(maxDate)
    setToDateInput(maxDate)
  }, [requests, fromDateInput, toDateInput])

  // ฟิลเตอร์หลักตามหมวดหมู่, อีเมล, และช่วงวันที่ (ยังไม่ใช้สถานะ)
  const baseFilteredRequests = useMemo(() => {
    const search = searchEmail.trim().toLowerCase()

    return requests.filter((request) => {
      const matchesCategory =
        categoryFilter === "all" ||
        request.category === categoryFilter

      const matchesSearch =
        search.length === 0 ||
        request.email.toLowerCase().includes(search)

      const dateValue = new Date(
        request.submittedDate,
      ).getTime()
      const afterFrom = fromDate
        ? dateValue >=
          new Date(
            fromDate.toISOString().slice(0, 10),
          ).getTime()
        : true
      const beforeTo = toDate
        ? dateValue <=
          new Date(
            toDate.toISOString().slice(0, 10),
          ).getTime()
        : true

      return (
        matchesCategory &&
        matchesSearch &&
        afterFrom &&
        beforeTo
      )
    })
  }, [requests, categoryFilter, searchEmail, fromDate, toDate])

  // ฟิลเตอร์ตามสถานะเฉพาะสำหรับข้อมูลที่แสดงในตาราง
  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") return baseFilteredRequests
    return baseFilteredRequests.filter(
      (request) => request.status === statusFilter,
    )
  }, [baseFilteredRequests, statusFilter])

  const {
    totalPages,
    safePage,
    paginatedRequests,
    pendingCount,
    rejectedCount,
    completedCount,
    totalCount,
  } = useMemo(() => {
    // นับจำนวนคำร้องตามสถานะจากชุด baseFilteredRequests
    // (ตัวเลขสรุปสถานะไม่ถูกเปลี่ยนตาม statusFilter)
    const pending = baseFilteredRequests.filter(
      (item) => item.status === "PENDING",
    ).length
    const rejected = baseFilteredRequests.filter(
      (item) => item.status === "REJECTED",
    ).length
    const completed = baseFilteredRequests.filter(
      (item) => item.status === "DONE",
    ).length
    const totalCount = baseFilteredRequests.length

    const total = Math.max(
      1,
      Math.ceil(filteredRequests.length / PAGE_SIZE),
    )
    const page = Math.min(currentPage, total)
    const startIndex = (page - 1) * PAGE_SIZE
    const endIndex = startIndex + PAGE_SIZE

    return {
      totalPages: total,
      safePage: page,
      paginatedRequests: filteredRequests.slice(
        startIndex,
        endIndex,
      ),
      pendingCount: pending,
      rejectedCount: rejected,
      completedCount: completed,
      totalCount,
    }
  }, [filteredRequests, baseFilteredRequests, currentPage])

  const canGoPrev = safePage > 1
  const canGoNext = safePage < totalPages

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

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

  async function resolveFromDetail(
    status: Exclude<RequestStatus, "PENDING">,
  ) {
    if (!detailRequest) return
    await updateStatus(detailRequest.id, status)
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
          <DashboardPageHeader
            title={
              isDetailView
                ? "รายละเอียดคำร้อง"
                : "รายการคำร้องจากผู้ใช้"
            }
          />
          {isDetailView ? (
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

              {loadError && (
                <p className="text-sm text-red-500">{loadError}</p>
              )}

              {isLoading && !detailRequest && (
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
                  <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                  <div className="mt-4 h-20 w-full animate-pulse rounded bg-slate-100" />
                </div>
              )}

              {detailRequest ? (
                <div className="flex justify-center">
                  <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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
                    <div className="space-y-3 bg-slate-50/80 p-4 text-xs">
                      <div className="space-y-2">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <div className="font-semibold">
                              อีเมลผู้ส่งคำร้อง
                            </div>
                            <div className="bg-white px-4 py-2 text-[11px] font-medium text-slate-800 shadow-sm">
                              {detailRequest.email}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="font-semibold">
                              วันที่ส่งคำร้อง
                            </div>
                            <div className="bg-white px-4 py-2 text-[11px] font-medium text-slate-800 shadow-sm">
                              {formatDisplayDate(detailRequest.submittedDate)}
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <div className="font-semibold">ชื่อหัวข้อ</div>
                            <div className="bg-white px-4 py-2 text-[11px] font-medium text-slate-800 shadow-sm">
                              {detailRequest.subject || "-"}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="font-semibold">
                              หมวดหมู่คำร้อง
                            </div>
                            <div className="bg-white px-4 py-2 text-[11px] font-medium text-slate-800 shadow-sm">
                              {CATEGORY_LABELS[detailRequest.category]}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="font-semibold">เนื้อหาคำร้อง</div>
                          <div className="bg-white px-4 py-3 text-[11px] text-slate-800 shadow-sm">
                            {detailRequest.content || "-"}
                          </div>
                        </div>
                      </div>
                      <div className="flex h-40 items-center justify-center rounded-xl bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedImage(
                              detailRequest.imageUrl &&
                                detailRequest.imageUrl.length > 0
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
                              detailRequest.imageUrl &&
                              detailRequest.imageUrl.length > 0
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
          ) : (
            <div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <div className="mt-3 flex w-full flex-wrap items-end gap-4">
                <div className="flex min-w-[320px] flex-1 flex-col gap-1">
                  <div className="flex items-center text-[11px] text-slate-600">
                    <span className="w-28">หมวดหมู่</span>
                    <span className="w-28 pl-3">สถานะ</span>
                    <span className="w-28 pl-3">อีเมล</span>
                    <span className="flex-1" />
                  </div>
                  <div className="flex items-center overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                    <Select
                      value={categoryFilterInput}
                      onValueChange={(value) =>
                        setCategoryFilterInput(
                          value as "all" | RequestCategory,
                        )
                      }
                    >
                      <SelectTrigger className="h-9 w-28 rounded-none border-none bg-sky-800 px-3 text-xs font-medium text-white shadow-none hover:bg-sky-700 [&>svg]:text-white">
                        <SelectValue placeholder="ทั้งหมด" />
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectItem value="all">ทั้งหมด</SelectItem>
                        <SelectItem value="PROBLEM">
                          ปัญหาการใช้งาน
                        </SelectItem>
                        <SelectItem value="FUNCTION">
                          ฟังก์ชันการทำงาน
                        </SelectItem>
                        <SelectItem value="NOTIFICATION">
                          การแจ้งเตือน
                        </SelectItem>
                        <SelectItem value="ADD_MEDICINE">
                          คำร้องขอเพิ่มยา
                        </SelectItem>
                        <SelectItem value="OTHER">อื่นๆ</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="h-5 w-px bg-slate-200" />
                    <Select
                      value={statusFilterInput}
                      onValueChange={(value) =>
                        setStatusFilterInput(
                          value as "all" | RequestStatus,
                        )
                      }
                    >
                      <SelectTrigger className="h-9 w-28 rounded-none border-none bg-sky-800 px-3 text-xs font-medium text-white shadow-none hover:bg-sky-700 [&>svg]:text-white">
                        <SelectValue placeholder="ทั้งหมด" />
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectItem value="all">ทั้งหมด</SelectItem>
                        <SelectItem value="PENDING">รอดำเนินการ</SelectItem>
                        <SelectItem value="REJECTED">ปฏิเสธ</SelectItem>
                        <SelectItem value="DONE">ดำเนินการแล้ว</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="h-5 w-px bg-slate-200" />
                    <Input
                      type="text"
                      placeholder="อีเมลผู้ส่งคำร้อง"
                      value={searchEmailInput}
                      onChange={(event) =>
                        setSearchEmailInput(event.target.value)
                      }
                      className="h-9 flex-1 rounded-none border-0 bg-transparent px-3 text-xs text-slate-800 placeholder:text-slate-400 shadow-none focus-visible:ring-0"
                    />
                  </div>
               
              </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-slate-600">
                    วันที่ส่งคำร้อง
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-700">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="flex h-9 items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm"
                        >
                          <span className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-white">
                              <Clock className="h-3.5 w-3.5" />
                            </span>
                            <span className="truncate">
                              {fromDateInput
                                ? `${fromDateInput.getDate()} ${fromDateInput.toLocaleDateString(
                                    "th-TH-u-ca-buddhist",
                                    { month: "short" },
                                  )} ${fromDateInput.getFullYear() + 543}`
                                : "เริ่มต้น"}
                            </span>
                          </span>
                          <CalendarIcon className="h-4 w-4 text-slate-400" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="p-2" side="bottom">
                        <Calendar
                          mode="single"
                          selected={fromDateInput}
                          onSelect={setFromDateInput}
                        />
                      </PopoverContent>
                    </Popover>
                    <span className="px-1 text-[10px] font-medium text-slate-500">
                      ถึง
                    </span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="flex h-9 items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm"
                        >
                          <span className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-white">
                              <Clock className="h-3.5 w-3.5" />
                            </span>
                            <span className="truncate">
                              {toDateInput
                                ? `${toDateInput.getDate()} ${toDateInput.toLocaleDateString(
                                    "th-TH-u-ca-buddhist",
                                    { month: "short" },
                                  )} ${toDateInput.getFullYear() + 543}`
                                : "สิ้นสุด"}
                            </span>
                          </span>
                          <CalendarIcon className="h-4 w-4 text-slate-400" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="p-2" side="bottom">
                        <Calendar
                          mode="single"
                          selected={toDateInput}
                          onSelect={setToDateInput}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                
              </div>
                <div className="flex flex-col gap-1">
                  <SearchButton
                    onClick={() => {
                      setCategoryFilter(categoryFilterInput)
                      setStatusFilter(statusFilterInput)
                      setSearchEmail(searchEmailInput)
                      setFromDate(fromDateInput)
                      setToDate(toDateInput)
                      setCurrentPage(1)
                    }}
                  />
                </div>
               
              </div>
            </div>
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-1 flex-wrap items-stretch gap-3 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("all")
                      setStatusFilterInput("all")
                      setCurrentPage(1)
                    }}
                    aria-pressed={statusFilter === "all"}
                    className={`flex flex-1 min-w-[200px] max-w-sm items-center justify-between gap-2 rounded-xl border px-5 py-3 text-xs transition ${
                      statusFilter === "all"
                        ? "border-slate-800 bg-slate-800 text-white shadow-sm"
                        : "border-slate-400 bg-slate-100 text-slate-800 hover:bg-slate-200"
                    }`}
                  >
                    <span>ทั้งหมด</span>
                    <span className="text-sm font-bold">
                      {totalCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next =
                        statusFilter === "PENDING" ? "all" : "PENDING"
                      setStatusFilter(next)
                      setStatusFilterInput(next)
                      setCurrentPage(1)
                    }}
                    aria-pressed={statusFilter === "PENDING"}
                    className={`flex flex-1 min-w-[200px] max-w-sm items-center justify-between gap-2 rounded-xl border px-5 py-3 text-xs transition ${
                      statusFilter === "PENDING"
                        ? "border-orange-700 bg-orange-600 text-white shadow-sm"
                        : "border-orange-500 bg-orange-500 text-orange-50 hover:bg-orange-600"
                    }`}
                  >
                    <span>รอดำเนินการ</span>
                    <span className="text-sm font-bold">
                      {pendingCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next =
                        statusFilter === "REJECTED" ? "all" : "REJECTED"
                      setStatusFilter(next)
                      setStatusFilterInput(next)
                      setCurrentPage(1)
                    }}
                    aria-pressed={statusFilter === "REJECTED"}
                    className={`flex flex-1 min-w-[200px] max-w-sm items-center justify-between gap-2 rounded-xl border px-5 py-3 text-xs transition ${
                      statusFilter === "REJECTED"
                        ? "border-red-700 bg-red-600 text-white shadow-sm"
                        : "border-red-500 bg-red-500 text-red-50 hover:bg-red-600"
                    }`}
                  >
                    <span>ปฏิเสธ</span>
                    <span className="text-sm font-bold">
                      {rejectedCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next =
                        statusFilter === "DONE" ? "all" : "DONE"
                      setStatusFilter(next)
                      setStatusFilterInput(next)
                      setCurrentPage(1)
                    }}
                    aria-pressed={statusFilter === "DONE"}
                    className={`flex flex-1 min-w-[200px] max-w-sm items-center justify-between gap-2 rounded-xl border px-5 py-3 text-xs transition ${
                      statusFilter === "DONE"
                        ? "border-emerald-800 bg-emerald-700 text-white shadow-sm"
                        : "border-emerald-700 bg-emerald-600 text-emerald-50 hover:bg-emerald-700"
                    }`}
                  >
                    <span>ดำเนินการแล้ว</span>
                    <span className="text-sm font-bold">
                      {completedCount}
                    </span>
                  </button>
                </div>
              </div>

              {loadError && (
                <p className="text-sm text-red-500">{loadError}</p>
              )}
              <div className="flex items-center justify-between">
                {isLoading && (
                  <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                )}
                  <div
                    className={`text-xs font-semibold text-slate-700 ${isLoading ? "opacity-0" : "opacity-100"}`}
                  >
                  จำนวนรายการทั้งหมด{" "}
                  <span className="text-slate-900">
                    {filteredRequests.length}
                  </span>{" "}
                  รายการ
                </div>
              </div>

              <Table className="border border-slate-200 bg-white">
                    <TableHeader>
                      <TableRow className="bg-slate-700">
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                          วันที่ส่งคำร้อง
                        </TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                          อีเมลผู้ส่งคำร้อง
                        </TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                          หมวดหมู่คำร้อง
                        </TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                          สถานะคำร้อง
                        </TableHead>
                        <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                          <span className="sr-only">การทำงาน</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading
                        ? Array.from({ length: PAGE_SIZE }, (_, index) => (
                            <TableRow
                              key={`request-skeleton-${index}`}
                              className="even:bg-slate-50/60"
                            >
                              <TableCell className="px-4 py-3">
                                <div className="mx-auto h-4 w-28 animate-pulse rounded bg-slate-200" />
                              </TableCell>
                              <TableCell className="px-4 py-3">
                                <div className="mx-auto h-4 w-40 animate-pulse rounded bg-slate-200" />
                              </TableCell>
                              <TableCell className="px-4 py-3">
                                <div className="mx-auto h-4 w-32 animate-pulse rounded bg-slate-200" />
                              </TableCell>
                              <TableCell className="px-4 py-3">
                                <div className="mx-auto h-5 w-24 animate-pulse rounded-full bg-slate-200" />
                              </TableCell>
                              <TableCell className="px-4 py-3">
                                <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-slate-200" />
                              </TableCell>
                            </TableRow>
                          ))
                        : paginatedRequests.map((request) => (
                        <TableRow
                          key={request.id}
                          className="even:bg-slate-50/60"
                        >
                          <TableCell className="px-4 py-3 text-center text-sm font-medium text-slate-800">
                            {formatDisplayDate(request.submittedDate)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center text-sm text-slate-700">
                            {request.email}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center text-sm text-slate-700">
                            {CATEGORY_LABELS[request.category]}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center text-sm text-slate-700">
                            <span
                              className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold ${STATUS_BADGE_CLASSES[request.status]}`}
                            >
                              {STATUS_LABELS[request.status]}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <a
                                href={`/requests?requestId=${encodeURIComponent(
                                  request.id,
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-slate-50 shadow-sm transition hover:bg-slate-800"
                                aria-label="เปิดรายละเอียดในแท็บใหม่"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!isLoading && paginatedRequests.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="py-10 text-center text-sm text-slate-500"
                          >
                            <div className="flex flex-col items-center gap-2">
                              <ImageIcon className="h-8 w-8 text-slate-300" />
                              <span>ไม่พบข้อมูล</span>
                              <span className="text-xs text-slate-400">
                                ไม่พบคำร้องตามเงื่อนไขที่เลือก
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm font-medium text-slate-700">
                <div className="flex flex-1 items-center justify-center gap-2">
                  {totalPages > 1 && (
                    <button
                      type="button"
                      onClick={() => goToPage(safePage - 1)}
                      disabled={!canGoPrev}
                      className="text-sky-700 hover:underline disabled:text-slate-400 disabled:hover:no-underline"
                    >
                      ก่อนหน้า
                    </button>
                  )}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, index) => {
                      const page = index + 1
                      const isActive = page === safePage
                      return (
                        <button
                          key={page}
                          type="button"
                          onClick={() => goToPage(page)}
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${
                            isActive
                              ? "bg-sky-700 text-white"
                              : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {page}
                        </button>
                      )
                    })}
                  </div>
                  {totalPages > 1 && (
                    <button
                      type="button"
                      onClick={() => goToPage(safePage + 1)}
                      disabled={!canGoNext}
                      className="text-sky-700 hover:underline disabled:text-slate-400 disabled:hover:no-underline"
                    >
                      ถัดไป
                    </button>
                  )}
                </div>
              </div>
            </section>
          </div>
          )}
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

export default function RequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
          กำลังโหลด...
        </div>
      }
    >
      <RequestsPageContent />
    </Suspense>
  )
}



