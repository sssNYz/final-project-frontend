/* eslint-disable react-hooks/rules-of-hooks */
"use client"

import type { CSSProperties } from "react"
import { useEffect, useMemo, useState } from "react"

import { Calendar as CalendarIcon, Clock } from "lucide-react"

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
  name: string
  profiles: number
  rows: number
}

// หน้า Dashboard หลัก (ปริมาณข้อมูลในระบบ)
// แสดงสรุปจำนวนโปรไฟล์ผู้ใช้และจำนวน log การใช้ยาต่อบัญชี
// พร้อมตัวกรองช่วงวันที่ และตารางสรุป
export default function Page() {
  const [rows, setRows] = useState<AccountRow[]>([])
  const defaultRange = useMemo(() => {
    const today = new Date()
    return {
      from: new Date(0),
      to: today,
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
  const [loadError, setLoadError] = useState<string | null>(null)

  // ดึงข้อมูลการใช้ยาตามช่วงวันที่จาก API เมื่อตัวกรองวันที่เปลี่ยน
  useEffect(() => {
    async function fetchUsage() {
      try {
        setIsLoading(true)
        setLoadError(null)

        const params = new URLSearchParams()
        if (fromDate) params.set("fromDate", fromDate.toISOString().slice(0, 10))
        if (toDate) params.set("toDate", toDate.toISOString().slice(0, 10))

        const query = params.toString()
        const url = query
          ? `/api/admin/v1/dashboard/usage?${query}`
          : "/api/admin/v1/dashboard/usage"

// อ่าน accessToken จาก localStorage เพื่อใช้ในการเรียก API [Session Required]
        const accessToken =
          typeof window !== "undefined"
            ? window.localStorage.getItem("accessToken")
            : null
// เตรียม headers สำหรับเรียก API
        const headers: Record<string, string> = {}
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`
        }
// เรียก API เพื่อดึงข้อมูลการใช้ยา
        const res = await apiFetch(url, {
          headers,
        })
        const data = await res.json().catch(() => null)
// ตรวจสอบผลลัพธ์การดึงข้อมูล
        if (!res.ok) {
          setLoadError(
            (data && (data.error as string | undefined)) ||
              "โหลดข้อมูลปริมาณการใช้ยาไม่สำเร็จ",
          )
          setRows([])
          return
        }
// แปลงข้อมูลที่ได้มาเป็นรูปแบบตาราง
        const items = (data?.items ?? []) as {
          accountId: number
          accountLabel: string
          patientCount: number
          medicationLogCount: number
        }[]

        const nextRows: AccountRow[] = items.map((item) => ({
          name: item.accountLabel,
          profiles: item.patientCount,
          rows: item.medicationLogCount,
        }))

        setRows(nextRows)
      } catch {
        setLoadError("เกิดข้อผิดพลาดในการโหลดข้อมูลปริมาณการใช้ยา")
        setRows([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchUsage()
  }, [fromDate, toDate])

  // ลบแถวที่ถูกเลือกออกจาก state (ฝั่ง UI เท่านั้น ไม่เรียก API ลบจริง)
  function handleDeleteSelected(names: string[]) {
    setRows((current) =>
      current.filter((row) => !names.includes(row.name)),
    )
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
            {loadError && (
              <p className="text-xs text-red-500">{loadError}</p>
            )}
            <section>
              <AccountUsageTable
                rows={rows}
                selectable
                onDeleteSelected={handleDeleteSelected}
              />
            </section>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
