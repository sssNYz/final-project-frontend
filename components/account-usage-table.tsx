"use client"

import { useEffect, useMemo, useState } from "react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type AccountRow = {
  id: number
  name: string
  profiles: number
  rows: number
}

type Props = {
  rows: AccountRow[]
  pageSize?: number
  selectable?: boolean
  onDeleteSelected?: (ids: number[]) => void
  deleteDisabled?: boolean
}

// ตารางสรุปปริมาณการใช้งานต่อบัญชี พร้อมแบ่งหน้าและเลือกหลายรายการได้
export function AccountUsageTable({
  rows,
  pageSize = 10,
  selectable = false,
  onDeleteSelected,
  deleteDisabled = false,
}: Props) {
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  // คำนวณจำนวนหน้า และแบ่งข้อมูลตาม pageSize
  const { totalPages, safePage, paginatedRows } = useMemo(() => {
    const total = Math.max(1, Math.ceil(rows.length / pageSize))
    const page = Math.min(currentPage, total)
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    return {
      totalPages: total,
      safePage: page,
      paginatedRows: rows.slice(startIndex, endIndex),
    }
  }, [rows, pageSize, currentPage])

  const canGoPrev = safePage > 1
  const canGoNext = safePage < totalPages
  const columnCount = 3 + (selectable ? 1 : 0)

  // เปลี่ยนหน้าปัจจุบันของตาราง
  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  // เลือก/ยกเลิกเลือกแถวตามชื่อบัญชี (ใช้สำหรับลบหลายรายการพร้อมกัน)
  function toggleSelect(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((value) => value !== id)
        : [...prev, id],
    )
  }

  // เรียก callback ลบรายการที่ถูกเลือก และรีเซ็ตการเลือก/หน้า
  function deleteSelected() {
    if (deleteDisabled) return
    if (!onDeleteSelected || selectedIds.length === 0) return
    onDeleteSelected(selectedIds)
    setSelectedIds([])
    setCurrentPage(1)
  }

  const hasSelection = selectedIds.length > 0
  const allSelected = rows.length > 0 && selectedIds.length === rows.length

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(rows.map((row) => row.id))
    }
  }

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedIds([])
      return
    }
    setSelectedIds((prev) =>
      prev.filter((id) => rows.some((row) => row.id === id)),
    )
  }, [rows])

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-700">
          จำนวนรายการทั้งหมด{" "}
          <span className="text-slate-900">{rows.length}</span> รายการ
        </div>
      </div>
      <Table className="border border-slate-200 bg-white">
        <TableHeader>
          <TableRow className="bg-slate-700">
            {selectable && (
              <TableHead className="w-10 px-4 py-3 text-center text-xs font-semibold text-white">
                <input
                  type="checkbox"
                  aria-label="เลือกทั้งหมด"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  disabled={deleteDisabled}
                />
              </TableHead>
            )}
            <TableHead className="w-48 px-4 py-3 text-center text-xs font-semibold text-white">
              บัญชีผู้ใช้
            </TableHead>
            <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
              จำนวนบัญชีผู้ใช้ย่อย
            </TableHead>
            <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
              จำนวนรายการใช้ยา
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedRows.map((row) => (
            <TableRow key={row.id} className="even:bg-slate-50/60">
              {selectable && (
                <TableCell className="w-10 px-4 py-3 text-center text-sm text-slate-700">
                  <input
                    type="checkbox"
                    aria-label={`เลือก ${row.name}`}
                    checked={selectedIds.includes(row.id)}
                    onChange={() => toggleSelect(row.id)}
                    disabled={deleteDisabled}
                  />
                </TableCell>
              )}
              <TableCell className="w-48 truncate px-4 py-3 text-left text-sm font-medium text-slate-800">
                {row.name}
              </TableCell>
              <TableCell className="px-4 py-3 text-center text-sm text-slate-700">
                {row.profiles}
              </TableCell>
              <TableCell className="px-4 py-3 text-center text-sm text-slate-700">
                {row.rows}
              </TableCell>
            </TableRow>
          ))}
          {paginatedRows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="py-10 text-center text-sm text-slate-500"
              >
                <div className="flex flex-col items-center gap-2">
                  <span>ไม่พบข้อมูล</span>
                  <span className="text-xs text-slate-400">
                    ยังไม่มีข้อมูลในช่วงวันที่ที่เลือก
                  </span>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm font-medium text-slate-700">
        {selectable && (
          <button
            type="button"
            onClick={deleteSelected}
            disabled={!hasSelection || deleteDisabled}
            className="rounded-md border border-orange-400 bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-200 disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
          >
            ลบรายการที่เลือก ({selectedIds.length})
          </button>
        )}
        <div className="flex flex-1 items-center justify-center gap-3">
          {totalPages > 1 && (
            <button
              type="button"
              onClick={() => goToPage(safePage - 1)}
              disabled={!canGoPrev}
              className="text-sky-700 disabled:text-slate-400 disabled:hover:underline-none hover:underline"
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
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
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
              className="text-sky-700 disabled:text-slate-400 disabled:hover:underline-none hover:underline"
            >
              ถัดไป
            </button>
          )}
        </div>
      </div>
    </>
  )
}
