"use client"

import type { CSSProperties } from "react"
import { useEffect, useMemo, useState } from "react"

import { Trash2, User2 } from "lucide-react"

import { apiFetch } from "@/lib/apiClient"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { SiteHeader } from "@/components/site-header"
import { useAlert } from "@/components/ui/alert-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SearchButton } from "@/components/ui/search-button"
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

type AccountRole = "admin" | "member"

type AdminAccount = {
  userId: number
  email: string
  role: AccountRole
  active: boolean
  lastLogin: string | null
}

function formatLastLogin(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const dateLabel = date.toLocaleDateString("th-TH-u-ca-buddhist", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  const timeLabel = date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  })
  return `${dateLabel} ${timeLabel}`
}

const ROLE_LABELS: Record<AccountRole, string> = {
  admin: "ผู้ดูแลระบบ",
  member: "สมาชิก",
}

const PAGE_SIZE = 10

// หน้า Dashboard > บัญชีผู้ใช้งาน
// แสดงรายการบัญชีแอดมิน/สมาชิก พร้อมตัวกรองสิทธิ์/สถานะ และปุ่มเพิ่ม/ลบ
export default function AccountsPage() {
  const { alert, confirm } = useAlert()
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<"all" | AccountRole>("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [searchEmail, setSearchEmail] = useState("")
  const [roleFilterInput, setRoleFilterInput] =
    useState<"all" | AccountRole>("all")
  const [statusFilterInput, setStatusFilterInput] =
    useState<"all" | "active" | "inactive">("all")
  const [searchEmailInput, setSearchEmailInput] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // โหลดรายการบัญชีผู้ใช้งานจาก API เมื่อเปิดหน้า
  useEffect(() => {
    async function fetchAccounts() {
      try {
        setIsLoading(true)
        setLoadError(null)
  
// เรียก API เพื่อดึงรายการบัญชีผู้ใช้งาน
        const res = await apiFetch("/api/admin/v1/users/list")

        const data = await res.json().catch(() => null)
  
        if (!res.ok) {
          setLoadError(
            (data && (data.error as string | undefined)) ||
              "โหลดข้อมูลบัญชีผู้ใช้ไม่สำเร็จ",
          )
          return
        }

        // แปลงข้อมูลที่ได้มาเป็นรูปแบบตาราง
        const items = (data?.accounts ?? []) as {
          userId: number
          email: string
          role: string
          active: boolean
          lastLogin: Date | string | null
        }[]

        const accounts: AdminAccount[] = items
          .filter((item) => {
            const normalizedRole = String(item.role ?? "").trim().toLowerCase()
            if (normalizedRole === "superadmin") {
              return false
            }
            return normalizedRole === "admin" || normalizedRole === "member"
          })
          .map((item) => ({
            userId: item.userId,
            email: item.email,
            role: String(item.role ?? "").trim().toLowerCase() as AccountRole,
            active: item.active,
            lastLogin: item.lastLogin
              ? typeof item.lastLogin === "string"
                ? item.lastLogin
                : new Date(item.lastLogin).toISOString()
              : null,
          }))
  
        setAccounts(accounts)
      } catch {
        setLoadError("เกิดข้อผิดพลาดในการโหลดข้อมูลบัญชีผู้ใช้")
      } finally {
        setIsLoading(false)
      }
    }
  
    fetchAccounts()
  }, [])

  // กรองบัญชีตาม role, สถานะ (active/inactive) และอีเมล
  const filteredAccounts = useMemo(() => {
    const search = searchEmail.trim().toLowerCase()

    return accounts.filter((account) => {
      const matchesRole =
        roleFilter === "all" || account.role === roleFilter

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? account.active
            : !account.active

      const matchesSearch =
        search.length === 0 ||
        account.email.toLowerCase().includes(search)

      return matchesRole && matchesStatus && matchesSearch
    })
  }, [accounts, roleFilter, statusFilter, searchEmail])

  // คำนวณข้อมูลสำหรับแบ่งหน้า (pagination)
  const { totalPages, safePage, paginatedAccounts } = useMemo(() => {
    const total = Math.max(1, Math.ceil(filteredAccounts.length / PAGE_SIZE))
    const page = Math.min(currentPage, total)
    const startIndex = (page - 1) * PAGE_SIZE
    const endIndex = startIndex + PAGE_SIZE

    return {
      totalPages: total,
      safePage: page,
      paginatedAccounts: filteredAccounts.slice(startIndex, endIndex),
    }
  }, [filteredAccounts, currentPage])

  const canGoPrev = safePage > 1
  const canGoNext = safePage < totalPages

  // เปลี่ยนหน้าปัจจุบันของตาราง
  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  // สลับสถานะ active/ inactive ผ่าน API และอัปเดต UI
  async function handleToggleStatus(userId: number) {
    // หา account ที่ต้องการเปลี่ยนสถานะ
    const target = accounts.find((account) => account.userId === userId)
    if (!target) return
    // ยืนยันการเปลี่ยนสถานะการใช้งาน
    const nextStatus = !target.active
    const confirmed = await confirm({
      variant: "warning",
      title: "ยืนยันการเปลี่ยนสถานะการใช้งาน",
      message: `ต้องการ${
        nextStatus ? "เปิดใช้งาน" : "ปิดใช้งาน"
      } บัญชี ${target.email} หรือไม่?`,
      confirmText: nextStatus ? "เปิดใช้งาน" : "ปิดใช้งาน",
      cancelText: "ยกเลิก",
    })
    if (!confirmed) return

    setLoadError(null)

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
// เรียก API เพื่ออัปเดตสถานะบัญชีผู้ใช้งาน
      const res = await apiFetch(`/api/admin/v1/users/${userId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: nextStatus }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setLoadError(
          (data && (data.error as string | undefined)) ||
            "Unable to update user status.",
        )
        return
      }
    } catch {
      setLoadError("Unable to update user status.")
      return
    }
    // อัปเดตสถานะใน UI
    setAccounts((current) =>
      current.map((account) =>
        account.userId === userId
          ? { ...account, active: nextStatus }
          : account,
      ),
    )
  }

  // ลบบัญชีผู้ใช้งานผ่าน API และอัปเดต state เมื่อสำเร็จ
  async function handleDeleteAccount(account: AdminAccount) {
    const confirmed = await confirm({
      variant: "warning",
      title: "ยืนยันการลบบัญชีผู้ใช้",
      message: `ต้องการลบบัญชีผู้ใช้ ${account.email} หรือไม่?`,
      confirmText: "ลบบัญชี",
      cancelText: "ยกเลิก",
    })
    if (!confirmed) return

    setLoadError(null)
// เรียก API เพื่อลบบัญชีผู้ใช้งาน
    try {
      const validId =
        typeof account.userId === "number" &&
        Number.isInteger(account.userId) &&
        account.userId > 0
          ? account.userId
          : null

      if (!validId) {
        setLoadError("ไม่พบรหัสผู้ใช้ที่ถูกต้องสำหรับการลบ")
        return
      }
      const res = await apiFetch("/api/admin/v2/users/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userIds: [validId],
          confirm: "CONFIRM",
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setLoadError(
          (data && (data.error as string | undefined)) ||
            "ไม่สามารถลบบัญชีผู้ใช้งานได้",
        )
        return
      }

      setAccounts((current) =>
        current.filter((item) => item.userId !== account.userId),
      )
    } catch {
      setLoadError("เกิดข้อผิดพลาดในการลบบัญชีผู้ใช้งาน")
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
            <DashboardPageHeader title="บัญชีผู้ใช้งาน"
            >
              <Button
                size="sm"
                className="h-9 rounded-md bg-emerald-500 px-4 text-xs font-semibold text-white shadow-md hover:bg-emerald-600"
                asChild
              >
                <a href="/accounts/new-admin">
                  + เพิ่มบัญชีผู้ดูแลระบบ
                </a>
              </Button>
            </DashboardPageHeader>
            <div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
            <section>
              <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <div className="mt-3 grid w-full items-end gap-4 md:grid-cols-[minmax(360px,1fr)_auto]">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center text-[11px] text-slate-600">
                      <span className="w-28">สิทธิการใช้งาน</span>
                      <span className="w-28 pl-3">สถานะ</span>
                      <span className="w-28 pl-3">อีเมล</span>
                      <span className="flex-1" />
                    </div>
                    <div className="flex items-center overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                      <Select
                        value={roleFilterInput}
                        onValueChange={(value) =>
                          setRoleFilterInput(value as "all" | AccountRole)
                        }
                      >
                        <SelectTrigger className="h-9 w-28 rounded-none border-none bg-sky-800 px-3 text-xs font-medium text-white shadow-none hover:bg-sky-700 [&>svg]:text-white">
                          <SelectValue placeholder="ทั้งหมด" />
                        </SelectTrigger>
                        <SelectContent align="start">
                          <SelectItem value="all">ทั้งหมด</SelectItem>
                          <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
                          <SelectItem value="member">สมาชิก</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="h-5 w-px bg-slate-200" />
                      <Select
                        value={statusFilterInput}
                        onValueChange={(value) =>
                          setStatusFilterInput(
                            value as "all" | "active" | "inactive",
                          )
                        }
                      >
                        <SelectTrigger className="h-9 w-28 rounded-none border-none bg-sky-800 px-3 text-xs font-medium text-white shadow-none hover:bg-sky-700 [&>svg]:text-white">
                          <SelectValue placeholder="ทั้งหมด" />
                        </SelectTrigger>
                        <SelectContent align="start">
                          <SelectItem value="all">ทั้งหมด</SelectItem>
                          <SelectItem value="active">เปิดใช้งาน</SelectItem>
                          <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="h-5 w-px bg-slate-200" />
                      <Input
                        type="text"
                        placeholder="ระบุอีเมลค้นหา..."
                        value={searchEmailInput}
                        onChange={(event) =>
                          setSearchEmailInput(event.target.value)
                        }
                        className="h-9 flex-1 rounded-none border-0 bg-transparent px-3 text-xs text-slate-800 placeholder:text-slate-400 shadow-none focus-visible:ring-0"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <SearchButton
                      onClick={() => {
                        setRoleFilter(roleFilterInput)
                        setStatusFilter(statusFilterInput)
                        setSearchEmail(searchEmailInput)
                        setCurrentPage(1)
                      }}
                    />
                  </div>
                </div>
              </div>

              {loadError && (
                <p className="mt-3 text-sm text-red-500">{loadError}</p>
              )}
              <div className="mb-2 mt-3 flex items-center justify-between">
                {isLoading ? (
                  <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                ) : (
                  <div className="text-xs font-semibold text-slate-700">
                    จำนวนรายการทั้งหมด{" "}
                    <span className="text-slate-900">
                      {filteredAccounts.length}
                    </span>{" "}
                    รายการ
                  </div>
                )}
              </div>
              <Table className="border border-slate-200 bg-white">
                <TableHeader>
                  <TableRow className="bg-slate-700">
                    <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                      ชื่อบัญชีผู้ใช้งาน
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                      สิทธิการใช้งาน
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                      สถานะการใช้งาน
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                      วันที่เข้าสู่ระบบล่าสุด
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
                          key={`account-skeleton-${index}`}
                          className="even:bg-slate-50/70"
                        >
                          <TableCell className="px-4 py-3">
                            <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <div className="mx-auto h-4 w-24 animate-pulse rounded bg-slate-200" />
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <div className="mx-auto h-5 w-16 animate-pulse rounded-full bg-slate-200" />
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <div className="mx-auto h-4 w-28 animate-pulse rounded bg-slate-200" />
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-slate-200" />
                          </TableCell>
                        </TableRow>
                      ))
                    : paginatedAccounts.map((account) => (
                        <TableRow
                          key={account.userId}
                          className="even:bg-slate-50/70"
                        >
                          <TableCell className="px-4 py-3 text-sm font-medium text-slate-800">
                            {account.email}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center text-sm text-slate-700">
                            {ROLE_LABELS[account.role]}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleStatus(account.userId)
                              }
                              className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[11px] font-semibold shadow-sm transition-colors ${
                                account.active
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "border-red-500 bg-red-500 text-white"
                              }`}
                              aria-pressed={account.active}
                            >
                              <span>
                                {account.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                              </span>
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white">
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${
                                    account.active
                                      ? "bg-emerald-500"
                                      : "bg-red-500"
                                  }`}
                                />
                              </span>
                            </button>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center text-sm text-slate-700">
                            {formatLastLogin(account.lastLogin)}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteAccount(account)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                              aria-label={`ลบบัญชีผู้ใช้ ${account.email}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                  {!isLoading && paginatedAccounts.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-10 text-center text-sm text-slate-500"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <User2 className="h-8 w-8 text-slate-300" />
                          <span>ไม่พบข้อมูล</span>
                          <span className="text-xs text-slate-400">
                            ลองปรับเงื่อนไขการค้นหาอีกครั้ง
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
