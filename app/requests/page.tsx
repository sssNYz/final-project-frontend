"use client"

import type { CSSProperties } from "react"
import type { Matcher } from "react-day-picker"
import { Suspense, useEffect, useMemo, useState } from "react"

import {
  Calendar as CalendarIcon,
  Clock,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { SiteHeader } from "@/components/site-header"
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

type RequestSummaryCounts = {
  total: number
  pending: number
  rejected: number
  completed: number
}

type DateRangeState = {
  from: Date | undefined
  to: Date | undefined
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
// จำนวนรายการต่อหน้าในตารางคำร้องจากผู้ใช้
const PAGE_SIZE = 6
const FETCH_PAGE_SIZE = 200

const initialRequests: RequestRow[] = []
const initialSummaryCounts: RequestSummaryCounts = {
  total: 0,
  pending: 0,
  rejected: 0,
  completed: 0,
}

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

function formatPickerDisplayDate(date: Date) {
  return `${date.getDate()} ${date.toLocaleDateString(
    "th-TH-u-ca-buddhist",
    { month: "short" },
  )} ${date.getFullYear() + 543}`
}

function parseApiDateLimit(value: unknown): Date | undefined {
  if (typeof value !== "string") return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

function formatDateParam(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseDateOnly(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return undefined
  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}

function getDateOnlyTime(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function mapRequestRow(item: Record<string, unknown>, index: number): RequestRow {
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
  }
}

function buildRequestQueryParams({
  page,
  pageSize,
  categoryFilter,
  statusFilter,
  searchEmail,
  fromDate,
  toDate,
}: {
  page: number
  pageSize: number
  categoryFilter: "all" | RequestCategory
  statusFilter: "all" | RequestStatus
  searchEmail: string
  fromDate?: Date
  toDate?: Date
}) {
  const params = new URLSearchParams()
  params.set("page", String(page))
  params.set("pageSize", String(pageSize))
  if (categoryFilter !== "all") {
    params.set("type", categoryFilter)
  }
  if (statusFilter !== "all") {
    params.set("status", statusFilter)
  }
  if (searchEmail.trim()) {
    params.set("search", searchEmail.trim())
  }
  if (fromDate) {
    params.set("fromDate", formatDateParam(fromDate))
  }
  if (toDate) {
    params.set("toDate", formatDateParam(toDate))
  }
  return params
}

function extractPayload(data: unknown) {
  return data && typeof data === "object" && "body" in data
    ? (data.body as Record<string, unknown>)
    : (data as Record<string, unknown> | null)
}

function RequestsPageContent() {
  const defaultRange = useMemo<DateRangeState>(
    () => ({
      from: undefined,
      to: undefined,
    }),
    [],
  )
  const [allRequests, setAllRequests] = useState<RequestRow[]>(initialRequests)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | RequestCategory
  >("all")
  const [statusFilter, setStatusFilter] = useState<
    "all" | RequestStatus
  >("all")
  const [searchEmail, setSearchEmail] = useState("")
  const [fromDate, setFromDate] = useState<Date | undefined>(defaultRange.from)
  const [toDate, setToDate] = useState<Date | undefined>(defaultRange.to)
  const [categoryFilterInput, setCategoryFilterInput] = useState<
    "all" | RequestCategory
  >("all")
  const [statusFilterInput, setStatusFilterInput] = useState<
    "all" | RequestStatus
  >("all")
  const [searchEmailInput, setSearchEmailInput] = useState("")
  const [fromDateInput, setFromDateInput] = useState<Date | undefined>(
    defaultRange.from,
  )
  const [toDateInput, setToDateInput] = useState<Date | undefined>(
    defaultRange.to,
  )
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [initialRange, setInitialRange] = useState<DateRangeState>(defaultRange)
  const [earliestDateLimit, setEarliestDateLimit] = useState<Date | undefined>(
    undefined,
  )
  const [latestDateLimit, setLatestDateLimit] = useState<Date | undefined>(
    undefined,
  )
  const [summaryCounts, setSummaryCounts] = useState<RequestSummaryCounts>(
    initialSummaryCounts,
  )
  const showSkeletonRows = isLoading && allRequests.length === 0

  useEffect(() => {
    async function fetchRequests() {
      try {
        setIsLoading(true)
        setLoadError(null)
        const collected: RequestRow[] = []
        let page = 1
        let fetchedTotalPages = 1
        let nextEarliest: Date | undefined
        let nextLatest: Date | undefined

        while (page <= fetchedTotalPages) {
          const params = buildRequestQueryParams({
            page,
            pageSize: FETCH_PAGE_SIZE,
            categoryFilter,
            statusFilter,
            searchEmail,
            fromDate: undefined,
            toDate: undefined,
          })
          const query = params.toString()
          const res = await apiFetch(`/api/admin/v1/user-request/list?${query}`)
          const data = await res.json().catch(() => null)
          const payload = extractPayload(data)

          if (!res.ok) {
            setLoadError(
              (payload && (payload.error as string | undefined)) ||
                (data && (data.error as string | undefined)) ||
                "โหลดคำร้องไม่สำเร็จ",
            )
            setAllRequests([])
            return
          }

          const items = (payload?.requests ??
            payload?.items ??
            payload?.data ??
            []) as Array<Record<string, unknown>>
          const metaSource = (payload?.meta ?? {}) as Record<string, unknown>
          const meta = metaSource as {
            totalPages?: number
          }
          const dateLimits = (
            payload?.dateLimits ??
            metaSource.dateLimits ??
            {}
          ) as {
            earliest?: string
            latest?: string
          }

          const apiEarliest = parseApiDateLimit(dateLimits.earliest)
          const apiLatest = parseApiDateLimit(dateLimits.latest)
          if (apiEarliest && (!nextEarliest || apiEarliest < nextEarliest)) {
            nextEarliest = apiEarliest
          }
          if (apiLatest && (!nextLatest || apiLatest > nextLatest)) {
            nextLatest = apiLatest
          }

          collected.push(
            ...items.map((item, index) => mapRequestRow(item, collected.length + index)),
          )

          if (typeof meta.totalPages === "number" && meta.totalPages > 0) {
            fetchedTotalPages = meta.totalPages
          } else if (items.length < FETCH_PAGE_SIZE) {
            fetchedTotalPages = page
          }

          page += 1
        }

        setEarliestDateLimit(nextEarliest)
        setLatestDateLimit(nextLatest)
        if (
          !fromDateInput &&
          !toDateInput &&
          !fromDate &&
          !toDate &&
          nextEarliest &&
          nextLatest
        ) {
          setInitialRange({
            from: nextEarliest,
            to: nextLatest,
          })
          setFromDate(nextEarliest)
          setToDate(nextLatest)
          setFromDateInput(nextEarliest)
          setToDateInput(nextLatest)
        }

        setAllRequests(collected)
      } catch {
        setLoadError("เกิดข้อผิดพลาดในการโหลดคำร้อง")
        setAllRequests([])
      } finally {
        setIsLoading(false)
      }
    }

    void fetchRequests()
  }, [categoryFilter, statusFilter, searchEmail])

  const filteredRequests = useMemo(() => {
    const fromTime = fromDate ? getDateOnlyTime(fromDate) : undefined
    const toTime = toDate ? getDateOnlyTime(toDate) : undefined

    return allRequests.filter((request) => {
      const requestDate = parseDateOnly(request.submittedDate)
      if (!requestDate) return false
      const requestTime = getDateOnlyTime(requestDate)

      if (fromTime !== undefined && requestTime < fromTime) {
        return false
      }
      if (toTime !== undefined && requestTime > toTime) {
        return false
      }

      return true
    })
  }, [allRequests, fromDate, toDate])

  useEffect(() => {
    const nextTotal = filteredRequests.length
    const nextTotalPages = Math.max(1, Math.ceil(nextTotal / pageSize))

    setTotalCount(nextTotal)
    setTotalPages(nextTotalPages)
    if (currentPage > nextTotalPages) {
      setCurrentPage(nextTotalPages)
    }

    setSummaryCounts({
      total: nextTotal,
      pending: filteredRequests.filter((request) => request.status === "PENDING").length,
      rejected: filteredRequests.filter((request) => request.status === "REJECTED").length,
      completed: filteredRequests.filter((request) => request.status === "DONE").length,
    })
  }, [filteredRequests, pageSize, currentPage])

  const {
    safePage,
  } = useMemo(() => {
    const page = Math.min(currentPage, totalPages)

    return {
      safePage: page,
    }
  }, [currentPage, totalPages])

  const canGoPrev = safePage > 1
  const canGoNext = safePage < totalPages
  const requests = filteredRequests.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  )
  const fromDateDisplayLabel = fromDateInput
    ? formatPickerDisplayDate(fromDateInput)
    : earliestDateLimit
      ? formatPickerDisplayDate(earliestDateLimit)
      : "เริ่มต้น"
  const toDateDisplayLabel = toDateInput
    ? formatPickerDisplayDate(toDateInput)
    : latestDateLimit
      ? formatPickerDisplayDate(latestDateLimit)
      : "สิ้นสุด"

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  function applyFilters(nextStatus = statusFilterInput) {
    setCategoryFilter(categoryFilterInput)
    setStatusFilter(nextStatus)
    setStatusFilterInput(nextStatus)
    setSearchEmail(searchEmailInput)
    setFromDate(fromDateInput ?? initialRange.from)
    setToDate(toDateInput ?? initialRange.to)
    setCurrentPage(1)
  }

  function handleFromDateSelect(date: Date | undefined) {
    setFromDateInput(date ?? initialRange.from)
  }

  function handleToDateSelect(date: Date | undefined) {
    setToDateInput(date ?? initialRange.to)
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
          <DashboardPageHeader title="รายการคำร้องจากผู้ใช้" />
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
                      onValueChange={(value) => {
                        const next = value as "all" | RequestCategory
                        setCategoryFilterInput(next)
                      }}
                    >
                      <SelectTrigger className="h-9 w-28 rounded-none border-none bg-sky-800 px-3 text-xs font-medium text-white shadow-none hover:bg-sky-700 [&>svg]:text-white">
                        <SelectValue placeholder="ทั้งหมด" />
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectItem value="all">ทั้งหมด</SelectItem>
                        <SelectItem value="PROBLEM">ปัญหาการใช้งาน</SelectItem>
                        <SelectItem value="FUNCTION">ฟังก์ชันการทำงาน</SelectItem>
                        <SelectItem value="NOTIFICATION">การแจ้งเตือน</SelectItem>
                        <SelectItem value="ADD_MEDICINE">คำร้องขอเพิ่มยา</SelectItem>
                        <SelectItem value="OTHER">อื่นๆ</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="h-5 w-px bg-slate-200" />
                    <Select
                      value={statusFilterInput}
                      onValueChange={(value) => {
                        const next = value as "all" | RequestStatus
                        setStatusFilterInput(next)
                      }}
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
                  <span className="text-[11px] text-slate-600">วันที่ส่งคำร้อง</span>
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
                            <span className="truncate">{fromDateDisplayLabel}</span>
                          </span>
                          <CalendarIcon className="h-4 w-4 text-slate-400" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="p-2" side="bottom">
                        <Calendar
                          mode="single"
                          selected={fromDateInput ?? earliestDateLimit}
                          onSelect={handleFromDateSelect}
                          defaultMonth={fromDateInput ?? earliestDateLimit}
                          startMonth={earliestDateLimit}
                          endMonth={latestDateLimit}
                          disabled={[
                            ...(latestDateLimit
                              ? ([{ after: latestDateLimit }] satisfies Matcher[])
                              : []),
                            ...(earliestDateLimit
                              ? ([{ before: earliestDateLimit }] satisfies Matcher[])
                              : []),
                          ]}
                        />
                      </PopoverContent>
                    </Popover>
                    <span className="px-1 text-[10px] font-medium text-slate-500">ถึง</span>
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
                            <span className="truncate">{toDateDisplayLabel}</span>
                          </span>
                          <CalendarIcon className="h-4 w-4 text-slate-400" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="p-2" side="bottom">
                        <Calendar
                          mode="single"
                          selected={toDateInput ?? latestDateLimit}
                          onSelect={handleToDateSelect}
                          defaultMonth={toDateInput ?? latestDateLimit}
                          startMonth={earliestDateLimit}
                          endMonth={latestDateLimit}
                          disabled={[
                            ...(latestDateLimit
                              ? ([{ after: latestDateLimit }] satisfies Matcher[])
                              : []),
                            ...(earliestDateLimit
                              ? ([{ before: earliestDateLimit }] satisfies Matcher[])
                              : []),
                          ]}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                    <SearchButton
                      onClick={() => {
                        applyFilters()
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
                      applyFilters("all")
                    }}
                    aria-pressed={statusFilter === "all"}
                    className={`flex flex-1 min-w-[200px] max-w-sm items-center justify-between gap-2 rounded-xl border px-5 py-3 text-xs transition ${
                      statusFilter === "all"
                        ? "border-slate-800 bg-slate-800 text-white shadow-sm"
                        : "border-slate-400 bg-slate-100 text-slate-800 hover:bg-slate-200"
                    }`}
                  >
                    <span>ทั้งหมด</span>
                    <span className="text-sm font-bold">{summaryCounts.total}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next =
                        statusFilter === "PENDING" ? "all" : "PENDING"
                      applyFilters(next)
                    }}
                    aria-pressed={statusFilter === "PENDING"}
                    className={`flex flex-1 min-w-[200px] max-w-sm items-center justify-between gap-2 rounded-xl border px-5 py-3 text-xs transition ${
                      statusFilter === "PENDING"
                        ? "border-orange-700 bg-orange-600 text-white shadow-sm"
                        : "border-orange-500 bg-orange-500 text-orange-50 hover:bg-orange-600"
                    }`}
                  >
                    <span>รอดำเนินการ</span>
                    <span className="text-sm font-bold">{summaryCounts.pending}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next =
                        statusFilter === "REJECTED" ? "all" : "REJECTED"
                      applyFilters(next)
                    }}
                    aria-pressed={statusFilter === "REJECTED"}
                    className={`flex flex-1 min-w-[200px] max-w-sm items-center justify-between gap-2 rounded-xl border px-5 py-3 text-xs transition ${
                      statusFilter === "REJECTED"
                        ? "border-red-700 bg-red-600 text-white shadow-sm"
                        : "border-red-500 bg-red-500 text-red-50 hover:bg-red-600"
                    }`}
                  >
                    <span>ปฏิเสธ</span>
                    <span className="text-sm font-bold">{summaryCounts.rejected}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next =
                        statusFilter === "DONE" ? "all" : "DONE"
                      applyFilters(next)
                    }}
                    aria-pressed={statusFilter === "DONE"}
                    className={`flex flex-1 min-w-[200px] max-w-sm items-center justify-between gap-2 rounded-xl border px-5 py-3 text-xs transition ${
                      statusFilter === "DONE"
                        ? "border-emerald-800 bg-emerald-700 text-white shadow-sm"
                        : "border-emerald-700 bg-emerald-600 text-emerald-50 hover:bg-emerald-700"
                    }`}
                  >
                    <span>ดำเนินการแล้ว</span>
                    <span className="text-sm font-bold">{summaryCounts.completed}</span>
                  </button>
                </div>
              </div>

              {loadError && <p className="text-sm text-red-500">{loadError}</p>}
              <div className="flex items-center justify-between">
                {showSkeletonRows && (
                  <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                )}
                <div
                  className={`text-xs font-semibold text-slate-700 ${showSkeletonRows ? "opacity-0" : "opacity-100"}`}
                >
                  จำนวนรายการทั้งหมด{" "}
                  <span className="text-slate-900">{totalCount}</span> รายการ
                </div>
              </div>

              <Table className="border border-slate-200 bg-white">
                <TableHeader>
                  <TableRow className="bg-slate-700 hover:bg-slate-700">
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
                  {showSkeletonRows
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
                    : requests.map((request) => (
                        <TableRow key={request.id} className="even:bg-slate-50/60">
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
                                href={`/requests/request-detail?requestId=${encodeURIComponent(
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
                  {!showSkeletonRows && requests.length === 0 && (
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
        </main>
      </SidebarInset>
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
