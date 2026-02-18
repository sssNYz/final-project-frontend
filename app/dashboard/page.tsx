﻿/* eslint-disable react-hooks/rules-of-hooks */
"use client"

import type { CSSProperties } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { Calendar as CalendarIcon, Clock } from "lucide-react"
import Swal from "sweetalert2"

import { apiFetch } from "@/lib/apiClient"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { SiteHeader } from "@/components/site-header"
import { Calendar } from "@/components/ui/calendar"
import { SearchButton } from "@/components/ui/search-button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AccountUsageTable } from "@/components/account-usage-table"

type AccountRow = {
  id: number
  name: string
  profiles: number
  rows: number
}
// แปลงวันที่เป็นจุดเริ่มต้นของวัน (00:00:00.000 UTC)
function startOfDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
      0,
    ),
  )
}
// แปลงวันที่เป็นจุดสิ้นสุดของวัน (23:59:59.999 UTC)
function endOfDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
      999,
    ),
  )
}
// แปลงวันที่เป็นรูปแบบพารามิเตอร์วันที่ในรูปแบบ UTC (เช่น 2024-01-01)
function formatUtcDateParam(date: Date) {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  )
    .toISOString()
    .slice(0, 10)
}
// แปลงวันที่เป็นรูปแบบวันที่สั้นของไทย (เช่น 1 ม.ค. 2567)
function formatThaiShortDate(date: Date) {
  return `${date.getDate()} ${date.toLocaleDateString("th-TH-u-ca-buddhist", {
    month: "short",
  })} ${date.getFullYear() + 543}`
}
// แยกวิเคราะห์ค่าวันที่จากข้อมูลที่ไม่แน่นอน
function parseDateValue(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === "number") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    const date = new Date(trimmed)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}
// แปลงวันที่เป็นเวลา UTC ที่เริ่มต้นของวัน
function toUtcDateOnly(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}
// ดึงช่วงวันที่จากข้อมูลสรุปและรายการย่อย
function extractLogDateRange(
  data: Record<string, unknown> | null,
  items: Array<Record<string, unknown>>,
) {
  const candidates: Date[] = []
  const dataFields = ["globalMinDate","globalMaxDate"]
  if (data) {
    dataFields.forEach((field) => {
      const date = parseDateValue(data[field])
      if (date) candidates.push(date)
    })
  }
// ดึงวันที่จากแต่ละรายการย่อย
  const itemFields = ["minLogDate","maxLogDate"]

  items.forEach((item) => {
    itemFields.forEach((field) => {
      const date = parseDateValue(item[field])
      if (date) candidates.push(date)
    })
  })

  if (candidates.length === 0) return null

  const times = candidates.map((date) => date.getTime())
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)
  if (!Number.isFinite(minTime) || !Number.isFinite(maxTime)) return null

  return {
    start: toUtcDateOnly(new Date(minTime)),
    end: toUtcDateOnly(new Date(maxTime)),
  }
}

// หน้า Dashboard หลัก (ปริมาณข้อมูลในระบบ)
// แสดงสรุปจำนวนโปรไฟล์ผู้ใช้และจำนวน log การใช้ยาต่อบัญชี
// พร้อมตัวกรองช่วงวันที่ และตารางสรุป
export default function Page() {
  const [rows, setRows] = useState<AccountRow[]>([])
  const defaultRange = useMemo(() => {
    return {
      from: undefined,
      to: undefined,
    }
  }, [])
  const [fromDateInput, setFromDateInput] = useState<Date | undefined>(
    defaultRange.from,
  )
  const [toDateInput, setToDateInput] = useState<Date | undefined>(
    defaultRange.to,
  )
  const [fromDate, setFromDate] = useState<Date | undefined>(
    defaultRange.from,
  )
  const [toDate, setToDate] = useState<Date | undefined>(defaultRange.to)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const showError = async (message: string, title = "เกิดข้อผิดพลาด") => {
    await Swal.fire({
      icon: "error",
      title,
      text: message,
    })
  }

  // ดึงข้อมูลการใช้ยาตามช่วงวันที่จาก API เมื่อตัวกรองวันที่เปลี่ยน
  const fetchUsage = useCallback(async () => {
    try {
      setIsLoading(true)

      const params = new URLSearchParams()
      if (fromDate) params.set("fromDate", formatUtcDateParam(fromDate))
      if (toDate) params.set("toDate", formatUtcDateParam(toDate))

      const query = params.toString()
      const url = query
        ? `/api/admin/v1/dashboard/usage?${query}`
        : "/api/admin/v1/dashboard/usage"

      const headers: Record<string, string> = {}
      const res = await apiFetch(url, {
        headers,
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const message =
          (data && (data.error as string | undefined)) ||
          "โหลดข้อมูลปริมาณการใช้ยาไม่สำเร็จ"
        await showError(message, "โหลดข้อมูลไม่สำเร็จ")
        setRows([])
        return
      }
      // แปลงข้อมูลจาก API เป็นรูปแบบที่ตารางต้องการ
      const items = (data?.items ?? []) as Array<Record<string, unknown>>

      const nextRows = items
        .map((item) => {
          const rawId =
            (item.accountId as number | string | undefined) ??
            (item.account_id as number | string | undefined) ??
            (item.userId as number | string | undefined) ??
            (item.user_id as number | string | undefined)
          const parsedId =
            typeof rawId === "string" ? Number(rawId) : rawId

          if (!Number.isFinite(parsedId)) {
            return null
          }

          return {
            id: Number(parsedId),
            name: String(item.accountLabel ?? item.account_name ?? item.name ?? "-"),
            profiles: Number(item.patientCount ?? item.patient_count ?? 0),
            rows: Number(item.medicationLogCount ?? item.medication_log_count ?? 0),
          } satisfies AccountRow
        })
        .filter((row): row is AccountRow => row !== null)

      setRows(nextRows)

      if (
        !fromDateInput &&
        !toDateInput &&
        !fromDate &&
        !toDate
      ) {
        const range = extractLogDateRange(
          (data ?? null) as Record<string, unknown> | null,
          items,
        )
        if (range) {
          setFromDate(range.start)
          setFromDateInput(range.start)
          setToDate(range.end)
          setToDateInput(range.end)
        }
      }
    } catch {
      await showError("เกิดข้อผิดพลาดในการโหลดข้อมูลปริมาณการใช้ยา")
      setRows([])
    } finally {
      setIsLoading(false)
    }
  }, [fromDate, toDate])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  async function deleteLogs(userIds: number[]) {
    const filteredIds = userIds.filter((id) => Number.isFinite(id))
    if (filteredIds.length === 0) {
      await showError("ไม่พบรหัสบัญชีที่ถูกต้องสำหรับการลบ")
      return
    }

    const start = fromDateInput ?? fromDate
    const end = toDateInput ?? toDate ?? start

    if (!start || !end) {
      await showError("กรุณาเลือกช่วงวันที่ก่อนลบ")
      return
    }

    const selectedRows = rows.filter((row) => filteredIds.includes(row.id))
    if (
      selectedRows.length > 0 &&
      selectedRows.every((row) => row.rows === 0)
    ) {
      const message = "ไม่มีข้อมูลประวัติการทานยาให้ลบ"
      await Swal.fire({
        icon: "info",
        title: "ไม่มีข้อมูลให้ลบ",
        text: message,
      })
      return
    }

    try {
      const countLabel =
        filteredIds.length === 1
          ? "1 บัญชี"
          : `${filteredIds.length} บัญชี`
      const rangeLabel = `${formatThaiShortDate(start)} - ${formatThaiShortDate(end)}`
      const confirmResult = await Swal.fire({
        title: "ยืนยันการลบ",
        html: `ต้องการลบข้อมูลการใช้ยา ${countLabel}<br/>ช่วงวันที่ ${rangeLabel} หรือไม่?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "ยืนยันลบ",
        cancelButtonText: "ยกเลิก",
        confirmButtonColor: "#ef4444",
        cancelButtonColor: "#94a3b8",
      })

      if (!confirmResult.isConfirmed) {
        return
      }

      setIsDeleting(true)

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      const res = await apiFetch("/api/admin/v1/user/delete-log", {
        method: "DELETE",
        headers,
        body: JSON.stringify({
          userIds: filteredIds,
          startDate: startOfDay(start).toISOString(),
          endDate: endOfDay(end).toISOString(),
        }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        const message =
          (data && (data.error as string | undefined)) ||
          "ลบข้อมูลไม่สำเร็จ"
        await Swal.fire({
          icon: "error",
          title: "ลบข้อมูลไม่สำเร็จ",
          text: message,
        })
        return
      }

      await fetchUsage()
      await Swal.fire({
        icon: "success",
        title: "ลบข้อมูลสำเร็จ",
        text: "ลบประวัติการทานยาเรียบร้อยแล้ว",
        showConfirmButton: false,
        timer: 1600,
      })
    } catch {
      const message = "เกิดข้อผิดพลาดในการลบข้อมูล"
      await Swal.fire({
        icon: "error",
        title: "ลบข้อมูลไม่สำเร็จ",
        text: message,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  function handleDeleteSelected(ids: number[]) {
    void deleteLogs(ids)
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
            <DashboardPageHeader title="ปริมาณข้อมูลในระบบ" 
            />
          <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <div className="mt-3 flex flex-wrap items-end gap-2 text-[11px] text-slate-700">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-slate-600">
                    ช่วงเวลาที่รับประทาน
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
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
                    <SearchButton
                      type="button"
                      className="px-4"
                      onClick={() => {
                        const selectedFrom = fromDateInput
                        const selectedTo = toDateInput ?? fromDateInput
                        setFromDate(selectedFrom)
                        setToDate(selectedTo)
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <section>
              <AccountUsageTable
                rows={rows}
                selectable
                onDeleteSelected={handleDeleteSelected}
                deleteDisabled={isDeleting || isLoading}
              />
            </section>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}





