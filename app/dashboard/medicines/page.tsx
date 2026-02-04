
"use client"

import type { CSSProperties, FormEvent } from "react"
import { useEffect, useMemo, useRef, useState } from "react"

import { FileText, Pill, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { apiUrl } from "@/lib/apiClient"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type UsageType = "oral" | "topical"

type MedicineRow = {
  id: string
  imageUrl?: string
  genericNameTh: string
  genericNameEn: string
  brandName: string
  usageType: UsageType
  status: boolean | null
  indications: string
  instructions: string
  adverseEffects: string
  contraindications: string
  precautions: string
  storage: string
}

const USAGE_LABELS: Record<UsageType, string> = {
  oral: "ยากิน",
  topical: "ยาใช้ภายนอก",
}

const PAGE_SIZE = 10

type FormState = {
  genericNameTh: string
  genericNameEn: string
  brandName: string
  usageType: UsageType
  indications: string
  instructions: string
  adverseEffects: string
  contraindications: string
  precautions: string
  storage: string
}

type ApiMedicinePayload = {
  mediId: number
  mediThName: string
  mediEnName: string
  mediTradeName: string | null
  mediType: "ORAL" | "TOPICAL"
  mediStatus?: {
    status?: boolean | null
  } | boolean | null
  mediUse?: string | null
  mediGuide?: string | null
  mediEffects?: string | null
  mediNoUse?: string | null
  mediWarning?: string | null
  mediStore?: string | null
  mediPicture?: string | null
}

const emptyForm: FormState = {
  genericNameTh: "",
  genericNameEn: "",
  brandName: "",
  usageType: "oral",
  indications: "",
  instructions: "",
  adverseEffects: "",
  contraindications: "",
  precautions: "",
  storage: "",
}

// แปลงค่าที่ได้จาก mediPicture ให้เป็น URL ที่ใช้งานได้บนเว็บ
// รองรับทั้ง URL เต็ม, path ที่ขึ้นต้นด้วย uploads/ หรือแค่ชื่อไฟล์
function resolveImageUrl(path?: string | null): string | undefined {
  if (!path) return undefined

  const trimmed = path.trim()
  if (!trimmed) return undefined
  if (/^https?:\/\//i.test(trimmed)) return trimmed

  const normalized = trimmed.replace(/^\/+/, "")
  return apiUrl(`/${normalized}`)
}

function resolveBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value
  if (typeof value === "number") {
    if (value === 1) return true
    if (value === 0) return false
    return null
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (["true", "1", "on", "active", "enabled"].includes(normalized)) {
      return true
    }
    if (["false", "0", "off", "inactive", "disabled"].includes(normalized)) {
      return false
    }
  }
  return null
}

function resolveMedicineStatus(
  value?: ApiMedicinePayload["mediStatus"],
): boolean | null {
  if (value && typeof value === "object") {
    return resolveBoolean(value.status)
  }
  return resolveBoolean(value)
}

function mapApiMedicine(
  apiMedicine: ApiMedicinePayload,
  fallback: Partial<MedicineRow> = {},
): MedicineRow {
  return {
    id: String(apiMedicine.mediId),
    imageUrl: resolveImageUrl(apiMedicine.mediPicture) ?? fallback.imageUrl,
    genericNameTh: apiMedicine.mediThName ?? fallback.genericNameTh ?? "",
    genericNameEn: apiMedicine.mediEnName ?? fallback.genericNameEn ?? "",
    brandName: apiMedicine.mediTradeName ?? fallback.brandName ?? "",
    usageType:
      apiMedicine.mediType === "TOPICAL"
        ? "topical"
        : apiMedicine.mediType === "ORAL"
          ? "oral"
          : fallback.usageType ?? "oral",
    status:
      resolveMedicineStatus(apiMedicine.mediStatus) ??
      fallback.status ??
      null,
    indications: apiMedicine.mediUse ?? fallback.indications ?? "",
    instructions: apiMedicine.mediGuide ?? fallback.instructions ?? "",
    adverseEffects: apiMedicine.mediEffects ?? fallback.adverseEffects ?? "",
    contraindications:
      apiMedicine.mediNoUse ?? fallback.contraindications ?? "",
    precautions: apiMedicine.mediWarning ?? fallback.precautions ?? "",
    storage: apiMedicine.mediStore ?? fallback.storage ?? "",
  }
}

// หน้า Dashboard > ข้อมูลยา
// ใช้จัดการรายการยาในระบบ (ค้นหา, กรอง, เพิ่ม/แก้ไข/ลบ และดูรายละเอียดของยาแต่ละตัว)
export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<MedicineRow[]>([])
  const [usageFilter, setUsageFilter] = useState<"all" | UsageType>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [usageFilterInput, setUsageFilterInput] =
    useState<"all" | UsageType>("all")
  const [searchTermInput, setSearchTermInput] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<FormState>(emptyForm)
  const [viewingMedicine, setViewingMedicine] = useState<MedicineRow | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState<Set<string>>(new Set())
  const [expandedImage, setExpandedImage] = useState<string | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(
    null,
  )
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const statusRequestedRef = useRef<Set<string>>(new Set())

  // โหลดสถานะการใช้งานของยาทั้งหมด
  async function loadAllStatuses(
    ids: string[],
    headers: Record<string, string>,
  ) {
    const uniqueIds = Array.from(new Set(ids))
    if (uniqueIds.length === 0) return

    const idsToFetch = uniqueIds.filter(
      (id) => !statusRequestedRef.current.has(id),
    )

    if (idsToFetch.length === 0) return

    idsToFetch.forEach((id) => {
      statusRequestedRef.current.add(id)
    })

    // ดึงสถานะการใช้งานของยาแต่ละตัว
    const results = await Promise.allSettled(
      idsToFetch.map(async (id) => {
        const res = await fetch(
          apiUrl(
            `/api/admin/v1/medicine/detail?mediId=${encodeURIComponent(id)}`,
          ),
          { headers },
        )
        const payload = await res.json().catch(() => null)

        if (!res.ok) {
          return { id, status: null }
        }

        const apiMedicine = (payload?.medicine ??
          payload?.item ??
          payload?.data ??
          null) as ApiMedicinePayload | null
        const status = resolveMedicineStatus(apiMedicine?.mediStatus)
        return { id, status }
      }),
    )

    // นำผลลัพธ์ที่ได้มาอัปเดตสถานะการใช้งานใน state
    const updates = new Map<string, boolean>()
    results.forEach((result) => {
      if (result.status !== "fulfilled") return
      if (typeof result.value.status !== "boolean") {
        statusRequestedRef.current.delete(result.value.id)
        return
      }
      updates.set(result.value.id, result.value.status)
    })

    if (updates.size === 0) return

    setMedicines((previous) =>
      previous.map((medicine) => {
        if (!updates.has(medicine.id)) return medicine
        return { ...medicine, status: updates.get(medicine.id) ?? null }
      }),
    )

    setViewingMedicine((previous) => {
      if (!previous) return previous
      const status = updates.get(previous.id)
      if (typeof status !== "boolean") return previous
      return { ...previous, status }
    })
  }

  // โหลดรายการยาจริงจาก API /api/admin/v1/medicine/list
  async function reloadMedicines() {
    try {
      setIsLoading(true)
      setLoadError(null)
      statusRequestedRef.current.clear()

// อ่าน accessToken จาก localStorage เพื่อใช้ในการเรียก API [Session Required]
      const accessToken =
        typeof window !== "undefined"
          ? window.localStorage.getItem("accessToken")
          : null

      const headers: Record<string, string> = {}
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }

      // ดึงรายการยาทั้งหมด (pageSize=1000) รวมถึงยาที่ถูกลบแล้ว (includeDeleted=true)
      const res = await fetch(
        apiUrl(
          "/api/admin/v1/medicine/list?page=1&pageSize=1000&includeDeleted=true",
        ),
        { headers },
      )

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setLoadError(
          (data && (data.error as string | undefined)) ||
            "โหลดข้อมูลยาไม่สำเร็จ",
        )
        setMedicines([])
        return
      }

      const items = (data?.items ?? []) as {
        mediId: number
        mediThName: string
        mediEnName: string
        mediTradeName: string | null
        mediType: "ORAL" | "TOPICAL"
        mediPicture?: string | null
        mediStatus?: ApiMedicinePayload["mediStatus"]
      }[]

      const next: MedicineRow[] = items.map((item) => {
        return {
          id: String(item.mediId),
          imageUrl: resolveImageUrl(item.mediPicture),
          genericNameTh: item.mediThName,
          genericNameEn: item.mediEnName,
          brandName: item.mediTradeName ?? "",
          usageType: item.mediType === "TOPICAL" ? "topical" : "oral",
          status: resolveMedicineStatus(item.mediStatus),
          indications: "",
          instructions: "",
          adverseEffects: "",
          contraindications: "",
          precautions: "",
          storage: "",
        }
      })

      const previousById = new Map(
        medicines.map((medicine) => [medicine.id, medicine]),
      )
      const merged = new Map<string, MedicineRow>()

      next.forEach((item) => {
        const existing = previousById.get(item.id)
        merged.set(item.id, {
          ...existing,
          ...item,
          status:
            typeof item.status === "boolean"
              ? item.status
              : existing?.status ?? null,
        })
      })

      medicines.forEach((item) => {
        if (!merged.has(item.id)) {
          merged.set(item.id, item)
        }
      })

      const mergedList = Array.from(merged.values())

      setMedicines(mergedList)
      setCurrentPage(1)
      await loadAllStatuses(
        mergedList.map((item) => item.id),
        headers,
      )
    } catch {
      setLoadError("เกิดข้อผิดพลาดในการโหลดข้อมูลยา")
      setMedicines([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    reloadMedicines()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // กรองรายการยาตามประเภทการใช้ (oral/topical) และคำค้นหา
  const filteredMedicines = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()

    return medicines.filter((medicine) => {
      const matchesUsage =
        usageFilter === "all" || medicine.usageType === usageFilter

      const matchesSearch =
        search.length === 0 ||
        medicine.genericNameEn.toLowerCase().includes(search) ||
        medicine.genericNameTh.toLowerCase().includes(search) ||
        medicine.brandName.toLowerCase().includes(search)

      return matchesUsage && matchesSearch
    })
  }, [medicines, usageFilter, searchTerm])

  const { totalPages, safePage, paginatedMedicines } = useMemo(() => {
    const total = Math.max(1, Math.ceil(filteredMedicines.length / PAGE_SIZE))
    const page = Math.min(currentPage, total)
    const startIndex = (page - 1) * PAGE_SIZE
    const endIndex = startIndex + PAGE_SIZE

    return {
      totalPages: total,
      safePage: page,
      paginatedMedicines: filteredMedicines.slice(startIndex, endIndex),
    }
  }, [filteredMedicines, currentPage])

  const canGoPrev = safePage > 1
  const canGoNext = safePage < totalPages

  useEffect(() => {
    const pending = paginatedMedicines.filter(
      (medicine) =>
        typeof medicine.status !== "boolean" &&
        !statusRequestedRef.current.has(medicine.id),
    )

    if (pending.length === 0) return

    const accessToken =
      typeof window !== "undefined"
        ? window.localStorage.getItem("accessToken")
        : null
    const headers: Record<string, string> = {}
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    }

    pending.forEach((medicine) => {
      statusRequestedRef.current.add(medicine.id)
    })

    let cancelled = false

    async function loadStatuses() {
      const results = await Promise.allSettled(
        pending.map(async (medicine) => {
          const res = await fetch(
            apiUrl(
              `/api/admin/v1/medicine/detail?mediId=${encodeURIComponent(
                medicine.id,
              )}`,
            ),
            { headers },
          )
          const payload = await res.json().catch(() => null)

          if (!res.ok) {
            return { id: medicine.id, status: null }
          }

          const apiMedicine = (payload?.medicine ??
            payload?.item ??
            payload?.data ??
            null) as ApiMedicinePayload | null

          const status = resolveMedicineStatus(apiMedicine?.mediStatus)
          return { id: medicine.id, status }
        }),
      )

      if (cancelled) return

      const updates = new Map<string, boolean>()
      results.forEach((result) => {
        if (result.status !== "fulfilled") return
        if (typeof result.value.status !== "boolean") return
        updates.set(result.value.id, result.value.status)
      })

      if (updates.size === 0) return

      setMedicines((previous) =>
        previous.map((medicine) => {
          if (!updates.has(medicine.id)) return medicine
          const nextStatus = updates.get(medicine.id) ?? null
          if (medicine.status === nextStatus) return medicine
          return { ...medicine, status: nextStatus }
        }),
      )
    }

    loadStatuses()

    return () => {
      cancelled = true
    }
  }, [paginatedMedicines])

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  function handleToggleStatus(id: string) {
    if (statusUpdating.has(id)) return
    const target = medicines.find((medicine) => medicine.id === id)
    if (!target || typeof target.status !== "boolean") return
    const nextStatus = !target.status

    setMedicines((current) =>
      current.map((medicine) =>
        medicine.id === id ? { ...medicine, status: nextStatus } : medicine,
      ),
    )

    setStatusUpdating((current) => {
      const next = new Set(current)
      next.add(id)
      return next
    })

    updateMedicineStatus(id, nextStatus, target.status)
  }

  async function updateMedicineStatus(
    id: string,
    nextStatus: boolean,
    previousStatus: boolean,
  ) {
    try {
      const accessToken =
        typeof window !== "undefined"
          ? window.localStorage.getItem("accessToken")
          : null

      const headers: Record<string, string> = {}
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }

      const formData = new FormData()
      formData.set("mediId", id)
      formData.set("mediStatus", String(nextStatus))

      const res = await fetch(apiUrl("/api/admin/v1/medicine/update"), {
        method: "PATCH",
        headers,
        body: formData,
      })

      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        setMedicines((current) =>
          current.map((medicine) =>
            medicine.id === id
              ? { ...medicine, status: previousStatus }
              : medicine,
          ),
        )
        toast.error(
          (payload && (payload.error as string | undefined)) ||
            "อัปเดตสถานะการใช้งานไม่สำเร็จ",
        )
        return
      }

      const apiMedicine = (payload?.medicine ??
        payload?.item ??
        payload?.data ??
        null) as ApiMedicinePayload | null

      const resolvedStatus = resolveMedicineStatus(apiMedicine?.mediStatus)
      if (typeof resolvedStatus === "boolean") {
        setMedicines((current) =>
          current.map((medicine) =>
            medicine.id === id
              ? { ...medicine, status: resolvedStatus }
              : medicine,
          ),
        )
        setViewingMedicine((current) =>
          current && current.id === id
            ? { ...current, status: resolvedStatus }
            : current,
        )
        return
      }

      const detailRes = await fetch(
        apiUrl(
          `/api/admin/v1/medicine/detail?mediId=${encodeURIComponent(id)}`,
        ),
        { headers },
      )
      const detailPayload = await detailRes.json().catch(() => null)
      if (!detailRes.ok) return
      const detailMedicine = (detailPayload?.medicine ??
        detailPayload?.item ??
        detailPayload?.data ??
        null) as ApiMedicinePayload | null
      const detailStatus = resolveMedicineStatus(detailMedicine?.mediStatus)
      if (typeof detailStatus !== "boolean") return
      setMedicines((current) =>
        current.map((medicine) =>
          medicine.id === id ? { ...medicine, status: detailStatus } : medicine,
        ),
      )
      setViewingMedicine((current) =>
        current && current.id === id
          ? { ...current, status: detailStatus }
          : current,
      )
    } catch {
      setMedicines((current) =>
        current.map((medicine) =>
          medicine.id === id
            ? { ...medicine, status: previousStatus }
            : medicine,
        ),
      )
      toast.error("เกิดข้อผิดพลาดในการอัปเดตสถานะการใช้งาน")
    } finally {
      setStatusUpdating((current) => {
        const next = new Set(current)
        next.delete(id)
        return next
      })
    }
  }

  function openCreateForm() {
    setEditingId("new")
    setFormValues(emptyForm)
    setImagePreview(null)
    setSelectedFileName(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function openEditForm(id: string) {
    const medicine = medicines.find((item) => item.id === id)
    if (!medicine) return

    setEditingId(id)
    setImagePreview(medicine.imageUrl ?? null)
    setSelectedFileName(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    setFormValues({
      genericNameTh: medicine.genericNameTh,
      genericNameEn: medicine.genericNameEn,
      brandName: medicine.brandName,
      usageType: medicine.usageType,
      indications: medicine.indications,
      instructions: medicine.instructions,
      adverseEffects: medicine.adverseEffects,
      contraindications: medicine.contraindications,
      precautions: medicine.precautions,
      storage: medicine.storage,
    })
  }

  function cancelForm() {
    setEditingId(null)
    setFormValues(emptyForm)
    setImagePreview(null)
    setSelectedFileName(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function handleFormChange<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setFormValues((previous) => ({
      ...previous,
      [key]: value,
    }))
  }

  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  // จัดการ submit ฟอร์มเพิ่ม/แก้ไขข้อมูลยา
  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const currentEditingId = editingId
    const isCreate = currentEditingId === "new"

    const data = {
      genericNameTh: formValues.genericNameTh.trim(),
      genericNameEn: formValues.genericNameEn.trim(),
      brandName: formValues.brandName.trim(),
      usageType: formValues.usageType,
      indications: formValues.indications.trim(),
      instructions: formValues.instructions.trim(),
      adverseEffects: formValues.adverseEffects.trim(),
      contraindications: formValues.contraindications.trim(),
      precautions: formValues.precautions.trim(),
      storage: formValues.storage.trim(),
    }

    // ต้องกรอกชื่อสามัญยา (ไทย/อังกฤษ) อย่างน้อยสำหรับการเพิ่ม/แก้ไข
    if (!data.genericNameTh || !data.genericNameEn) {
      toast.error("กรุณากรอกชื่อสามัญยา (ไทย) และชื่อสามัญยา (อังกฤษ)")
      return
    }

    try {
      const accessToken =
        typeof window !== "undefined"
          ? window.localStorage.getItem("accessToken")
          : null

      const formData = new FormData()
      formData.set("mediThName", data.genericNameTh)
      formData.set("mediEnName", data.genericNameEn)
      if (data.brandName) {
        formData.set("mediTradeName", data.brandName)
      }
      formData.set(
        "mediType",
        data.usageType === "topical" ? "TOPICAL" : "ORAL",
      )
      if (data.indications) formData.set("mediUse", data.indications)
      if (data.instructions) formData.set("mediGuide", data.instructions)
      if (data.adverseEffects) formData.set("mediEffects", data.adverseEffects)
      if (data.contraindications) {
        formData.set("mediNoUse", data.contraindications)
      }
      if (data.precautions) formData.set("mediWarning", data.precautions)
      if (data.storage) formData.set("mediStore", data.storage)
      if (!isCreate && currentEditingId && currentEditingId !== "new") {
        formData.set("mediId", currentEditingId)
      }

      const pictureFile =
        fileInputRef.current?.files && fileInputRef.current.files[0]
          ? fileInputRef.current.files[0]
          : null
      if (pictureFile) {
        formData.set("picture", pictureFile)
      }

      const headers: Record<string, string> = {}
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }

      const res = await fetch(
        apiUrl(
          isCreate
            ? "/api/admin/v1/medicine/create"
            : "/api/admin/v1/medicine/update",
        ),
        {
          method: isCreate ? "POST" : "PATCH",
          headers,
          body: formData,
        },
      )

      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        const message =
          (payload && (payload.error as string | undefined)) ||
          "ไม่สามารถบันทึกข้อมูลยาได้"
        toast.error(message)
        return
      }

      const apiMedicine = (payload?.medicine ?? null) as
        | ApiMedicinePayload
        | null

      if (!apiMedicine) {
        toast.error("บันทึกข้อมูลยาไม่สำเร็จ: รูปแบบข้อมูลไม่ถูกต้อง")
        return
      }

      const existingMedicine =
        !isCreate && currentEditingId && currentEditingId !== "new"
          ? medicines.find((medicine) => medicine.id === currentEditingId)
          : null

      const mapped = mapApiMedicine(apiMedicine, {
        ...data,
        imageUrl: existingMedicine?.imageUrl,
        status: existingMedicine?.status ?? null,
      })

      if (isCreate) {
        setMedicines((previous) => [mapped, ...previous])
        setCurrentPage(1)
      } else if (currentEditingId && currentEditingId !== "new") {
        setMedicines((previous) =>
          previous.map((medicine) =>
            medicine.id === currentEditingId ? mapped : medicine,
          ),
        )
      }

      setEditingId(null)
      setFormValues(emptyForm)
      setImagePreview(null)
      setSelectedFileName(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      toast.success(
        isCreate ? "เพิ่มข้อมูลยาเรียบร้อยแล้ว" : "แก้ไขข้อมูลยาเรียบร้อยแล้ว",
      )
    } catch (error) {
      console.error("Error saving medicine:", error)
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูลยา")
    }
  }

  // ลบข้อมูลยาจากระบบผ่าน API (soft delete) แล้วรีโหลดตาราง
  async function handleDeleteMedicine(id: string) {
    const medicine = medicines.find((item) => item.id === id)
    const label =
      medicine?.genericNameEn?.trim() ||
      medicine?.genericNameTh?.trim() ||
      "รายการนี้"
    const confirmed = window.confirm(
      `ต้องการลบข้อมูลยา ${label} หรือไม่?`,
    )
    if (!confirmed) return

    try {
      const accessToken =
        typeof window !== "undefined"
          ? window.localStorage.getItem("accessToken")
          : null

      const headers: Record<string, string> = {}
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }

      const res = await fetch(
        apiUrl(
          `/api/admin/v1/medicine/delete?mediId=${encodeURIComponent(id)}`,
        ),
        {
          method: "DELETE",
          headers,
        },
      )

      const payload = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(
          (payload && (payload.error as string | undefined)) ||
            "ลบข้อมูลยาไม่สำเร็จ",
        )
        return
      }

      toast.success("ลบข้อมูลยาเรียบร้อยแล้ว")
      await reloadMedicines()
    } catch {
      toast.error("เกิดข้อผิดพลาดในการลบข้อมูลยา")
    }
  }

  // เปิดดูรายละเอียดข้อมูลยา
  async function openViewDetails(id: string) {
    const medicine = medicines.find((item) => item.id === id)
    if (medicine) {
      setViewingMedicine(medicine)
    }

    try {
      setLoadError(null)
      const accessToken =
        typeof window !== "undefined"
          ? window.localStorage.getItem("accessToken")
          : null
      const headers: Record<string, string> = {}
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`
      }

      const res = await fetch(
        apiUrl(
          `/api/admin/v1/medicine/detail?mediId=${encodeURIComponent(id)}`,
        ),
        { headers },
      )
      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        setLoadError(
          (payload && (payload.error as string | undefined)) ||
            "โหลดรายละเอียดยาไม่สำเร็จ",
        )
        return
      }

      const apiMedicine = (payload?.medicine ??
        payload?.item ??
        payload?.data ??
        null) as ApiMedicinePayload | null

      if (!apiMedicine) {
        setLoadError("ไม่พบข้อมูลรายละเอียดยา")
        return
      }

      const mapped = mapApiMedicine(apiMedicine, medicine ?? undefined)
      setViewingMedicine(mapped)
      setMedicines((previous) =>
        previous.map((item) =>
          item.id === mapped.id ? { ...item, ...mapped } : item,
        ),
      )
    } catch {
      setLoadError("เกิดข้อผิดพลาดในการโหลดรายละเอียดยา")
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
          <DashboardPageHeader title="ข้อมูลยาในระบบ">
            <Button
              size="sm"
              type="button"
              className="h-9 rounded-md bg-emerald-500 px-4 text-xs font-semibold text-white shadow-md hover:bg-emerald-600"
              onClick={openCreateForm}
            >
              + เพิ่มยาใหม่
            </Button>
          </DashboardPageHeader>
          <div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <div className="mt-3 grid w-full items-end gap-4 md:grid-cols-[minmax(360px,1fr)_auto]">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center text-[11px] text-slate-600">
                    <span className="w-28">รูปแบบการใช้ยา</span>
                    <span className="w-28 pl-3">ชื่อยา / ชื่อการค้ายา</span>
                    <span className="flex-1" />
                  </div>
                  <div className="flex items-center overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                    <Select
                      value={usageFilterInput}
                      onValueChange={(value) =>
                        setUsageFilterInput(value as "all" | UsageType)
                      }
                    >
                      <SelectTrigger className="h-9 w-28 rounded-none border-none bg-sky-800 px-3 text-xs font-medium text-white shadow-none hover:bg-sky-700 [&>svg]:text-white">
                        <SelectValue placeholder="ทั้งหมด" />
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectItem value="all">ทั้งหมด</SelectItem>
                        <SelectItem value="oral">ยากิน</SelectItem>
                        <SelectItem value="topical">ยาใช้ภายนอก</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="h-5 w-px bg-slate-200" />
                    <Input
                      type="text"
                      placeholder="ค้นหาชื่อยา หรือชื่อการค้า"
                      value={searchTermInput}
                      onChange={(event) =>
                        setSearchTermInput(event.target.value)
                      }
                      className="h-9 flex-1 rounded-none border-0 bg-transparent px-3 text-xs text-slate-800 placeholder:text-slate-400 shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <SearchButton
                    type="button"
                    className="px-4"
                    onClick={() => {
                      setUsageFilter(usageFilterInput)
                      setSearchTerm(searchTermInput)
                      setCurrentPage(1)
                    }}
                  />
                </div>
              </div>
            </div>
            {(editingId || loadError) && (
              <Card className="shadow-sm">
                <CardContent className="space-y-4 pt-1">
                  {editingId && (
                  <form
                    onSubmit={handleFormSubmit}
                    className="rounded-md border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700"
                  >
                    <div className="mb-2 font-semibold text-slate-800">
                      {editingId === "new"
                        ? "เพิ่มข้อมูลยาใหม่"
                        : "แก้ไขข้อมูลยา"}
                    </div>
                    <div className="grid gap-4 md:grid-cols-[1.5fr_3fr]">
                      <div className="space-y-3">
                        <div className="flex flex-col gap-2">
                          <label className="text-xs text-slate-600">
                            รูปภาพยา
                          </label>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="flex h-36 w-36 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white p-2 shadow-sm"
                              aria-label="เลือกรูปภาพยา"
                            >
                              {imagePreview ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={imagePreview}
                                  alt="รูปภาพยา"
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                <Pill className="h-8 w-8 text-slate-400" />
                              )}
                            </button>
                          </div>
                          <Input
                            type="file"
                            accept="image/png"
                            ref={fileInputRef}
                            id="medicine-image"
                            onChange={(event) => {
                              const files = event.target.files
                              if (!files || files.length === 0) {
                                setSelectedFileName(null)
                                return
                              }

                              const file = files[0]

                              if (file.type !== "image/png") {
                                window.alert(
                                  "กรุณาเลือกรูปภาพนามสกุล PNG เท่านั้น",
                                )
                                event.target.value = ""
                                setSelectedFileName(null)
                                return
                              }

                              const url = URL.createObjectURL(file)
                              setImagePreview((previous) => {
                                if (previous && previous.startsWith("blob:")) {
                                  URL.revokeObjectURL(previous)
                                }
                                return url
                              })
                              setSelectedFileName(file.name)
                            }}
                            className="sr-only"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="h-9 rounded-md bg-sky-700 px-3 text-xs font-semibold text-white hover:bg-sky-800"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              เลือกไฟล์
                            </Button>
                            <span className="text-xs text-slate-500">
                              {selectedFileName || "ยังไม่ได้เลือกไฟล์"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            รองรับเฉพาะไฟล์รูปภาพนามสกุล PNG
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="flex min-w-0 flex-col gap-1">
                            <label className="text-xs text-slate-600">
                              ชื่อสามัญทางยาภาษาไทย
                            </label>
                            <Input
                              value={formValues.genericNameTh}
                              onChange={(event) =>
                                handleFormChange(
                                  "genericNameTh",
                                  event.target.value,
                                )
                              }
                              className="h-9 rounded-md border border-slate-200 bg-white text-xs text-slate-800"
                              placeholder="เช่น พาราเซตามอล"
                            />
                          </div>
                          <div className="flex min-w-0 flex-col gap-1">
                            <label className="text-xs text-slate-600">
                              ชื่อสามัญทางยาภาษาอังกฤษ
                            </label>
                            <Input
                              value={formValues.genericNameEn}
                              onChange={(event) =>
                                handleFormChange(
                                  "genericNameEn",
                                  event.target.value,
                                )
                              }
                              className="h-9 rounded-md border border-slate-200 bg-white text-xs text-slate-800"
                              placeholder="เช่น Paracetamol"
                            />
                          </div>
                        </div>
                        <div className="flex min-w-0 flex-col gap-1">
                          <label className="text-xs text-slate-600">
                            ชื่อการค้ายา
                          </label>
                          <textarea
                            value={formValues.brandName}
                            onChange={(event) =>
                              handleFormChange(
                                "brandName",
                                event.target.value,
                              )
                            }
                            className="min-h-[60px] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-100"
                            placeholder="เช่น Tylenol"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-600">
                            รูปแบบการใช้ยา
                          </label>
                          <Select
                            value={formValues.usageType}
                            onValueChange={(value) =>
                              handleFormChange(
                                "usageType",
                                value as UsageType,
                              )
                            }
                          >
                            <SelectTrigger className="h-9 rounded-md border-none bg-sky-800 px-3 text-xs font-medium text-white shadow-none hover:bg-sky-700 [&>svg]:text-white">
                              <SelectValue placeholder="เลือกรูปแบบการใช้ยา" />
                            </SelectTrigger>
                            <SelectContent align="start">
                              <SelectItem value="oral">ยากิน</SelectItem>
                              <SelectItem value="topical">
                                ยาใช้ภายนอก
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-600">
                            ข้อบ่งใช้
                          </label>
                          <textarea
                            value={formValues.indications}
                            onChange={(event) =>
                              handleFormChange(
                                "indications",
                                event.target.value,
                              )
                            }
                            className="min-h-[60px] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-100"
                            placeholder="อธิบายข้อบ่งใช้ของยา เช่น ลดไข้ บรรเทาอาการปวดศีรษะ"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-600">
                            คำแนะนำการใช้ยา
                          </label>
                          <textarea
                            value={formValues.instructions}
                            onChange={(event) =>
                              handleFormChange(
                                "instructions",
                                event.target.value,
                              )
                            }
                            className="min-h-[60px] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-100"
                            placeholder="วิธีการใช้ยา เวลาในการรับประทาน และข้อควรปฏิบัติ"
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-600">
                            อาการไม่พึงประสงค์จากการใช้ยา
                          </label>
                          <textarea
                            value={formValues.adverseEffects}
                            onChange={(event) =>
                              handleFormChange(
                                "adverseEffects",
                                event.target.value,
                              )
                            }
                            className="min-h-[60px] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-100"
                            placeholder="เช่น คลื่นไส้ ผื่นคัน เวียนศีรษะ"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-600">
                            ข้อห้ามใช้
                          </label>
                          <textarea
                            value={formValues.contraindications}
                            onChange={(event) =>
                              handleFormChange(
                                "contraindications",
                                event.target.value,
                              )
                            }
                            className="min-h-[60px] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-100"
                            placeholder="เช่น ห้ามใช้ในผู้ที่เคยแพ้ยานี้อย่างรุนแรง"
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-600">
                            ข้อควรระวังในการใช้
                          </label>
                          <textarea
                            value={formValues.precautions}
                            onChange={(event) =>
                              handleFormChange(
                                "precautions",
                                event.target.value,
                              )
                            }
                            className="min-h-[60px] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-100"
                            placeholder="เช่น ใช้ด้วยความระมัดระวังในผู้ป่วยโรคตับหรือไต"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-slate-600">
                            การเก็บรักษา
                          </label>
                          <textarea
                            value={formValues.storage}
                            onChange={(event) =>
                              handleFormChange(
                                "storage",
                                event.target.value,
                              )
                            }
                            className="min-h-[60px] rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus-visible:border-sky-500 focus-visible:ring-2 focus-visible:ring-sky-100"
                            placeholder="เช่น เก็บที่อุณหภูมิห้อง หลีกเลี่ยงความชื้นและแสงแดด"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-md px-4 text-xs"
                        onClick={cancelForm}
                      >
                        ยกเลิก
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        className="rounded-md bg-sky-600 px-4 text-xs font-semibold text-white hover:bg-sky-700"
                      >
                        บันทึกข้อมูลยา
                      </Button>
                    </div>
                  </form>
                  )}

                  {loadError && (
                    <div className="text-sm text-red-500">{loadError}</div>
                  )}
                </CardContent>
              </Card>
            )}

            <section>
              <div className="mb-2 flex items-center justify-between">
                {isLoading ? (
                  <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                ) : (
                  <div className="text-xs font-semibold text-slate-700">
                    จำนวนรายการทั้งหมด{" "}
                    <span className="text-slate-900">
                      {filteredMedicines.length}
                    </span>{" "}
                    รายการ
                  </div>
                )}
              </div>
              <Table className="border border-slate-200 rounded-xl bg-white">
                <TableHeader>
                  <TableRow className="bg-slate-700">
                    <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                      ชื่อสามัญยา
                    </TableHead>
                    <TableHead className="w-[220px] px-4 py-3 text-center text-xs font-semibold text-white">
                      ชื่อการค้า
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                      รูปแบบการใช้
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                      สถานะการใช้งาน
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                      <span className="sr-only">จัดการ</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: PAGE_SIZE }, (_, index) => (
                        <TableRow
                          key={`medicine-skeleton-${index}`}
                          className="even:bg-slate-50/70"
                        >
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
                              <div className="space-y-2">
                                <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                                <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="w-[220px] px-4 py-3 text-center">
                            <div className="mx-auto h-4 w-24 animate-pulse rounded bg-slate-200" />
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <div className="mx-auto h-4 w-20 animate-pulse rounded bg-slate-200" />
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <div className="mx-auto h-5 w-16 animate-pulse rounded-full bg-slate-200" />
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-slate-200" />
                          </TableCell>
                        </TableRow>
                      ))
                    : paginatedMedicines.map((medicine) => (
                        <TableRow
                          key={medicine.id}
                          className="even:bg-slate-50/70"
                        >
                          <TableCell className="px-4 py-3 text-sm font-semibold text-slate-800">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-slate-100 p-1">
                                {medicine.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={medicine.imageUrl}
                                    alt={medicine.genericNameEn}
                                    className="h-full w-full object-contain"
                                  />
                                ) : (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src="/medicine-placeholder.svg"
                                    alt="รูปยาตัวอย่าง"
                                    className="h-full w-full object-contain"
                                  />
                                )}
                              </div>
                              <div>
                                <div>{medicine.genericNameEn}</div>
                                {medicine.genericNameTh && (
                                  <div className="text-xs font-normal text-slate-600">
                                    ({medicine.genericNameTh})
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="w-[220px] px-4 py-3 text-center text-sm text-slate-700">
                            {medicine.brandName ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="block max-w-[200px] truncate text-center">
                                    {medicine.brandName}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="max-w-xs text-xs"
                                >
                                  {medicine.brandName}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center text-sm text-slate-700">
                            {USAGE_LABELS[medicine.usageType]}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(medicine.id)}
                              disabled={
                                typeof medicine.status !== "boolean" ||
                                statusUpdating.has(medicine.id)
                              }
                              className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[11px] font-semibold shadow-sm transition-colors disabled:cursor-not-allowed ${
                                typeof medicine.status !== "boolean"
                                  ? "border-slate-300 bg-slate-100 text-slate-400"
                                  : medicine.status
                                    ? "border-emerald-500 bg-emerald-500 text-white"
                                    : "border-red-500 bg-red-500 text-white"
                              }`}
                              aria-pressed={
                                typeof medicine.status === "boolean"
                                  ? medicine.status
                                  : undefined
                              }
                            >
                              <span>
                                {typeof medicine.status === "boolean"
                                  ? medicine.status
                                    ? "ON"
                                    : "OFF"
                                  : "--"}
                              </span>
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white">
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${
                                    typeof medicine.status !== "boolean"
                                      ? "bg-slate-300"
                                      : medicine.status
                                        ? "bg-emerald-500"
                                        : "bg-red-500"
                                  }`}
                                />
                              </span>
                            </button>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleDeleteMedicine(medicine.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                                aria-label={`ลบข้อมูลยา ${medicine.genericNameEn}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openViewDetails(medicine.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-slate-50 hover:bg-slate-800"
                                aria-label={`ดูรายละเอียดข้อมูลยา ${medicine.genericNameEn}`}
                              >
                                <FileText className="h-4 w-4" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  {!isLoading && paginatedMedicines.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-10 text-center text-sm text-slate-500"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Pill className="h-8 w-8 text-slate-300" />
                          <span>ไม่พบข้อมูล</span>
                          <span className="text-xs text-slate-400">
                            ไม่พบข้อมูลยาตามเงื่อนไขที่เลือก
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

        <Drawer
          open={Boolean(viewingMedicine)}
          onOpenChange={(open) => {
            if (!open) {
              setViewingMedicine(null)
            }
          }}
          direction="right"
        >
          <DrawerContent className="w-full max-w-md border-l">
            {viewingMedicine && (
              <>
                <DrawerHeader>
                  <DrawerTitle className="text-base font-semibold text-slate-800">
                    {viewingMedicine.genericNameEn}
                  </DrawerTitle>
                  <p className="text-xs text-slate-600">
                    {viewingMedicine.genericNameTh && (
                      <span>{viewingMedicine.genericNameTh}</span>
                    )}
                    {viewingMedicine.brandName && (
                      <span>{` • ชื่อการค้า: ${viewingMedicine.brandName}`}</span>
                    )}
                  </p>
                </DrawerHeader>
                <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 text-xs text-slate-700">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedImage(
                          viewingMedicine.imageUrl ||
                            "/medicine-placeholder.svg",
                        )
                      }
                      className="flex h-20 w-20 cursor-zoom-in items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200"
                      aria-label="ขยายรูปยา"
                    >
                      {viewingMedicine.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={viewingMedicine.imageUrl}
                          alt={viewingMedicine.genericNameEn}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src="/medicine-placeholder.svg"
                          alt="รูปยาตัวอย่าง"
                          className="h-full w-full object-contain"
                        />
                      )}
                    </button>
                    <div className="text-xs text-slate-600">
                      <div className="font-semibold text-slate-800">
                        รูปแบบการใช้ยา:{" "}
                        <span className="font-normal">
                          {USAGE_LABELS[viewingMedicine.usageType]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <section>
                    <h3 className="mb-1 font-semibold text-slate-800">
                      ข้อบ่งใช้
                    </h3>
                    <p className="whitespace-pre-line">
                      {viewingMedicine.indications || "-"}
                    </p>
                  </section>
                  <section>
                    <h3 className="mb-1 font-semibold text-slate-800">
                      คำแนะนำการใช้ยา
                    </h3>
                    <p className="whitespace-pre-line">
                      {viewingMedicine.instructions || "-"}
                    </p>
                  </section>
                  <section>
                    <h3 className="mb-1 font-semibold text-slate-800">
                      อาการไม่พึงประสงค์จากการใช้ยา
                    </h3>
                    <p className="whitespace-pre-line">
                      {viewingMedicine.adverseEffects || "-"}
                    </p>
                  </section>
                  <section>
                    <h3 className="mb-1 font-semibold text-slate-800">
                      ข้อห้ามใช้
                    </h3>
                    <p className="whitespace-pre-line">
                      {viewingMedicine.contraindications || "-"}
                    </p>
                  </section>
                  <section>
                    <h3 className="mb-1 font-semibold text-slate-800">
                      ข้อควรระวังในการใช้
                    </h3>
                    <p className="whitespace-pre-line">
                      {viewingMedicine.precautions || "-"}
                    </p>
                  </section>
                  <section>
                    <h3 className="mb-1 font-semibold text-slate-800">
                      การเก็บรักษา
                    </h3>
                    <p className="whitespace-pre-line">
                      {viewingMedicine.storage || "-"}
                    </p>
                  </section>
                </div>
                <DrawerFooter className="border-t bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-full bg-sky-600 px-4 text-xs font-semibold text-white hover:bg-sky-700"
                      onClick={() => {
                        openEditForm(viewingMedicine.id)
                        setViewingMedicine(null)
                      }}
                    >
                      แก้ไขข้อมูลยา
                    </Button>
                    <DrawerClose asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-full px-4 text-xs"
                      >
                        ปิด
                      </Button>
                    </DrawerClose>
                  </div>
                </DrawerFooter>
              </>
            )}
          </DrawerContent>
        </Drawer>
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
              alt="รูปยาขยาย"
              className="max-h-[85vh] w-auto max-w-[85vw] object-contain"
            />
          </div>
        </div>
      )}
    </SidebarProvider>
  )
}
