"use client"

import type { CSSProperties } from "react"
import { useMemo, useState } from "react"

import { FileText, Image as ImageIcon, Search, X } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

type RequestStatus = "pending" | "rejected" | "completed"

type RequestCategory =
  | "data-info"
  | "usage-problem"
  | "feature"
  | "other"

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
  pending: "รอยืนยัน",
  rejected: "ปฏิเสธ",
  completed: "เสร็จสิ้น",
}

const STATUS_BADGE_CLASSES: Record<RequestStatus, string> = {
  pending:
    "border-orange-400 bg-orange-100 text-orange-700",
  rejected: "border-red-400 bg-red-100 text-red-700",
  completed:
    "border-emerald-500 bg-emerald-100 text-emerald-700",
}

const CATEGORY_LABELS: Record<RequestCategory, string> = {
  "data-info": "คำร้องขอข้อมูลยา",
  "usage-problem": "ปัญหาการใช้งาน",
  feature: "ฟังก์ชันการทำงาน",
  other: "อื่นๆ",
}

const PAGE_SIZE = 10

const initialRequests: RequestRow[] = [
  {
    id: "REQ-2025-0001",
    email: "Sunny@gmail.com",
    category: "usage-problem",
    status: "pending",
    submittedDate: "2025-04-02",
    subject: "เพิ่มบัญชีผู้ใช้ไม่ได้",
    content: "กดเพิ่มบัญชีผู้ใช้ไม่ได้ กรุณาช่วยตรวจสอบให้ด้วยค่ะ",
  },
  {
    id: "REQ-2025-0002",
    email: "Dook@gmail.com",
    category: "usage-problem",
    status: "pending",
    submittedDate: "2025-05-02",
    subject: "ข้อมูลการใช้งานไม่อัปเดต",
    content: "รายละเอียดการใช้งานไม่อัปเดตหลังจากเพิ่มข้อมูลใหม่",
  },
  {
    id: "REQ-2025-0003",
    email: "Deer@gmail.com",
    category: "feature",
    status: "rejected",
    submittedDate: "2025-06-19",
    subject: "เสนอเพิ่มฟังก์ชันแจ้งเตือน",
    content: "อยากให้แอปมีการแจ้งเตือนก่อนเวลารับประทานยา 30 นาที",
  },
  {
    id: "REQ-2025-0004",
    email: "Cartoon@gmail.com",
    category: "feature",
    status: "completed",
    submittedDate: "2025-01-25",
    subject: "เพิ่มปุ่มลัดดูประวัติ",
    content: "ขอปุ่มลัดสำหรับดูประวัติการรับประทานยาหน้าแรก",
  },
  {
    id: "REQ-2025-0005",
    email: "user1@example.com",
    category: "data-info",
    status: "pending",
    submittedDate: "2025-04-10",
    subject: "ขอข้อมูลยาเพิ่มเติม",
    content: "ต้องการรายละเอียดผลข้างเคียงของยาที่ใช้อยู่",
  },
  {
    id: "REQ-2025-0006",
    email: "user2@example.com",
    category: "data-info",
    status: "completed",
    submittedDate: "2025-03-28",
    subject: "ขอส่งออกข้อมูลการรักษา",
    content: "ต้องการไฟล์สรุปประวัติการรับประทานยาเพื่อไปพบแพทย์",
  },
  {
    id: "REQ-2025-0007",
    email: "user3@example.com",
    category: "other",
    status: "rejected",
    submittedDate: "2025-02-14",
    subject: "ลบประวัติการใช้งาน",
    content: "ต้องการลบประวัติการใช้งานทั้งหมดจากระบบ",
  },
  {
    id: "REQ-2025-0008",
    email: "user4@example.com",
    category: "usage-problem",
    status: "pending",
    submittedDate: "2025-05-20",
    subject: "แอปเด้งออกเอง",
    content: "แอปปิดตัวเองอัตโนมัติเมื่อกดเข้าเมนูดูประวัติยา",
  },
]

// หน้า Dashboard > รายการคำร้องจากผู้ใช้
// ใช้ดู/กรองคำร้องตามหมวดหมู่ สถานะ ช่วงวันที่ และอีเมล พร้อมทั้งเปิดดูรายละเอียดคำร้องทีละรายการ
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

// คอมโพเนนต์หลักของหน้ารายการคำร้องใน Dashboard
export default function RequestsPage() {
  const [requests, setRequests] =
    useState<RequestRow[]>(initialRequests)
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
  const [activeRequest, setActiveRequest] =
    useState<RequestRow | null>(null)

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
      (item) => item.status === "pending",
    ).length
    const rejected = baseFilteredRequests.filter(
      (item) => item.status === "rejected",
    ).length
    const completed = baseFilteredRequests.filter(
      (item) => item.status === "completed",
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

  function updateStatus(id: string, status: RequestStatus) {
    setRequests((current) =>
      current.map((request) =>
        request.id === id ? { ...request, status } : request,
      ),
    )
  }

  function openRequestDetail(request: RequestRow) {
    setActiveRequest(request)
  }

  function closeRequestDetail() {
    setActiveRequest(null)
  }

  function resolveFromDetail(status: Exclude<RequestStatus, "pending">) {
    if (!activeRequest) return
    updateStatus(activeRequest.id, status)
    setActiveRequest(null)
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
          <DashboardPageHeader title="รายการคำร้องจากผู้ใช้">
            <div className="flex w-full items-end gap-3 overflow-x-auto pb-1">
              <div className="flex flex-1 items-end justify-center gap-3">
                {/* กล่องค้นหาอีเมล */}
                <div className="relative min-w-[260px] max-w-md flex-1">
                  <Input
                    type="text"
                    placeholder="อีเมลผู้ส่งคำร้อง"
                    value={searchEmailInput}
                    onChange={(event) =>
                      setSearchEmailInput(event.target.value)
                    }
                    className="h-9 w-full rounded-full bg-white/90 pr-10 text-xs text-slate-800 placeholder:text-slate-400 shadow-sm"
                  />
                  <button
                    type="button"
                    className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-sky-600 text-white shadow hover:bg-sky-700"
                    onClick={() => {
                      setCategoryFilter(categoryFilterInput)
                      setStatusFilter(statusFilterInput)
                      setSearchEmail(searchEmailInput)
                      setFromDate(fromDateInput)
                      setToDate(toDateInput)
                      setCurrentPage(1)
                    }}
                    aria-label="ค้นหารายการคำร้อง"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* หมวดหมู่ + สถานะ (วางต่อจากช่องค้นหา) */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-600">
                      หมวดหมู่
                    </span>
                    <Select
                      value={categoryFilterInput}
                      onValueChange={(value) =>
                        setCategoryFilterInput(
                          value as "all" | RequestCategory,
                        )
                      }
                    >
                      <SelectTrigger className="h-8 w-auto rounded-full border-none bg-slate-900/80 px-3 text-[11px] font-medium text-white shadow-sm hover:bg-slate-900">
                        <SelectValue placeholder="ทั้งหมด" />
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectItem value="all">ทั้งหมด</SelectItem>
                        <SelectItem value="data-info">
                          คำร้องขอข้อมูลยา
                        </SelectItem>
                        <SelectItem value="usage-problem">
                          ปัญหาการใช้งาน
                        </SelectItem>
                        <SelectItem value="feature">
                          ฟังก์ชันการทำงาน
                        </SelectItem>
                        <SelectItem value="other">อื่นๆ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-600">สถานะ</span>
                    <Select
                      value={statusFilterInput}
                      onValueChange={(value) =>
                        setStatusFilterInput(
                          value as "all" | RequestStatus,
                        )
                      }
                    >
                      <SelectTrigger className="h-8 w-auto rounded-full border-none bg-slate-900/80 px-3 text-[11px] font-medium text-white shadow-sm hover:bg-slate-900">
                        <SelectValue placeholder="ทั้งหมด" />
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectItem value="all">ทั้งหมด</SelectItem>
                        <SelectItem value="pending">รอยืนยัน</SelectItem>
                        <SelectItem value="rejected">ปฏิเสธ</SelectItem>
                        <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* แคปซูลเลือกช่วงวันที่ (ต่อท้าย dropdown) */}
                <div className="flex items-center gap-2 text-[11px] text-slate-700 ml-10">
                  <span className="mr-1 text-xs font-medium">
                    วันที่ส่งคำร้อง
                  </span>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-9 items-center justify-center rounded-full bg-slate-800 px-4 text-xs text-slate-100"
                        >
                          <span className="truncate">
                            {fromDateInput
                              ? `${fromDateInput.getDate()} ${fromDateInput.toLocaleDateString(
                                  "th-TH-u-ca-buddhist",
                                  { month: "short" },
                                )} ${fromDateInput.getFullYear() + 543}`
                              : "เริ่มต้น"}
                          </span>
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
                    <span className="text-[10px] text-slate-500">ถึง</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-9 items-center justify-center rounded-full bg-slate-800 px-4 text-xs text-slate-100"
                        >
                          <span className="truncate">
                            {toDateInput
                              ? `${toDateInput.getDate()} ${toDateInput.toLocaleDateString(
                                  "th-TH-u-ca-buddhist",
                                  { month: "short" },
                                )} ${toDateInput.getFullYear() + 543}`
                              : "สิ้นสุด"}
                          </span>
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
              </div>
            </div>
          </DashboardPageHeader>
          <div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
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
                        statusFilter === "pending" ? "all" : "pending"
                      setStatusFilter(next)
                      setStatusFilterInput(next)
                      setCurrentPage(1)
                    }}
                    aria-pressed={statusFilter === "pending"}
                    className={`flex flex-1 min-w-[200px] max-w-sm items-center justify-between gap-2 rounded-xl border px-5 py-3 text-xs transition ${
                      statusFilter === "pending"
                        ? "border-orange-700 bg-orange-600 text-white shadow-sm"
                        : "border-orange-500 bg-orange-500 text-orange-50 hover:bg-orange-600"
                    }`}
                  >
                    <span>รอยืนยัน</span>
                    <span className="text-sm font-bold">
                      {pendingCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next =
                        statusFilter === "rejected" ? "all" : "rejected"
                      setStatusFilter(next)
                      setStatusFilterInput(next)
                      setCurrentPage(1)
                    }}
                    aria-pressed={statusFilter === "rejected"}
                    className={`flex flex-1 min-w-[200px] max-w-sm items-center justify-between gap-2 rounded-xl border px-5 py-3 text-xs transition ${
                      statusFilter === "rejected"
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
                        statusFilter === "completed" ? "all" : "completed"
                      setStatusFilter(next)
                      setStatusFilterInput(next)
                      setCurrentPage(1)
                    }}
                    aria-pressed={statusFilter === "completed"}
                    className={`flex flex-1 min-w-[200px] max-w-sm items-center justify-between gap-2 rounded-xl border px-5 py-3 text-xs transition ${
                      statusFilter === "completed"
                        ? "border-emerald-700 bg-emerald-600 text-white shadow-sm"
                        : "border-emerald-500 bg-emerald-500 text-emerald-50 hover:bg-emerald-600"
                    }`}
                  >
                    <span>เสร็จสิ้น</span>
                    <span className="text-sm font-bold">
                      {completedCount}
                    </span>
                  </button>
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
                          จัดการ
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRequests.map((request) => (
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
                          <TableCell className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                openRequestDetail(request)
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700 hover:bg-sky-200"
                              aria-label="ดูรายละเอียดคำร้อง"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {paginatedRequests.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="py-6 text-center text-sm text-slate-500"
                          >
                            ไม่พบคำร้องตามเงื่อนไขที่เลือก
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm font-medium text-slate-700">
                <span className="text-xs text-slate-600">
                  รายการคำร้องที่พบ{" "}
                  <span className="font-semibold text-slate-800">
                    {filteredRequests.length}
                  </span>{" "}
                  รายการ · หน้า {safePage} จาก {totalPages}
                </span>
                <div className="flex flex-1 items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(safePage - 1)}
                    disabled={!canGoPrev}
                    className="text-sky-700 hover:underline disabled:text-slate-400 disabled:hover:no-underline"
                  >
                    ก่อนหน้า
                  </button>
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
                  <button
                    type="button"
                    onClick={() => goToPage(safePage + 1)}
                    disabled={!canGoNext}
                    className="text-sky-700 hover:underline disabled:text-slate-400 disabled:hover:no-underline"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            </section>

            {activeRequest && (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-4">
                <div className="relative w-full max-w-[720px] max-h-[90vh] overflow-y-auto rounded-3xl bg-gradient-to-br from-sky-900 via-sky-700 to-slate-700 p-6 text-white shadow-2xl">
                  <button
                    type="button"
                    onClick={closeRequestDetail}
                    className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white shadow hover:bg-orange-600"
                    aria-label="ปิดหน้ารายละเอียดคำร้อง"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <h2 className="mt-2 text-center text-lg font-semibold">
                    คำร้องจากผู้ใช้
                  </h2>
                  <div className="mb-4 mt-2 flex justify-center">
                    <span
                      className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold ${STATUS_BADGE_CLASSES[activeRequest.status]}`}
                    >
                      STATUS :{" "}
                      <span className="ml-1">
                        {STATUS_LABELS[activeRequest.status]}
                      </span>
                    </span>
                  </div>
                  <div className="space-y-3 bg-white/5 p-4 text-xs">
                    <div className="space-y-2">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <div className="font-semibold">
                            อีเมลผู้ส่งคำร้อง
                          </div>
                          <div className="bg-white/90 px-4 py-2 text-[11px] font-medium text-slate-800">
                            {activeRequest.email}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="font-semibold">
                            วันที่ส่งคำร้อง
                          </div>
                          <div className="bg-white/90 px-4 py-2 text-[11px] font-medium text-slate-800">
                            {formatDisplayDate(activeRequest.submittedDate)}
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <div className="font-semibold">ชื่อหัวข้อ</div>
                          <div className="bg-white/90 px-4 py-2 text-[11px] font-medium text-slate-800">
                            {activeRequest.subject}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="font-semibold">
                            หมวดหมู่คำร้อง
                          </div>
                          <div className="bg-white/90 px-4 py-2 text-[11px] font-medium text-slate-800">
                            {CATEGORY_LABELS[activeRequest.category]}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="font-semibold">
                          เนื้อหาคำร้อง
                        </div>
                        <div className="bg-white/90 px-4 py-3 text-[11px] text-slate-800">
                          {activeRequest.content}
                        </div>
                      </div>
                    </div>
                    <div className="flex h-40 items-center justify-center bg-white">
                      {/* ถ้ามีรูปแนบมากับคำร้อง ใช้รูปนั้น ถ้าไม่มีก็ใช้รูปยาตัวอย่าง */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          activeRequest.imageUrl &&
                          activeRequest.imageUrl.length > 0
                            ? activeRequest.imageUrl
                            : "/medicine-placeholder.svg"
                        }
                        alt="รูปยาประกอบคำร้อง"
                        className="h-full w-full max-w-[200px] object-contain"
                      />
                    </div>
                    </div>
                    {activeRequest.status === "pending" && (
                      <div className="mt-6 flex items-center justify-between gap-4">
                        <Button
                          type="button"
                          onClick={() => resolveFromDetail("rejected")}
                          className="flex-1 rounded-none bg-red-500 text-xs font-semibold text-white hover:bg-red-600"
                        >
                          ปฏิเสธ
                        </Button>
                        <Button
                          type="button"
                          onClick={() => resolveFromDetail("completed")}
                          className="flex-1 rounded-none bg-emerald-500 text-xs font-semibold text-white hover:bg-emerald-600"
                        >
                          เสร็จสิ้น
                        </Button>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
