
"use client"

import type { CSSProperties, FormEvent } from "react"
import { useEffect, useMemo, useRef, useState } from "react"

import { FileText, Pill, Search, Trash2 } from "lucide-react"
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

type UsageType = "oral" | "topical"

type MedicineRow = {
  id: string
  imageUrl?: string
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

const USAGE_LABELS: Record<UsageType, string> = {
  oral: "ยากิน",
  topical: "ยาใช้ภายนอก",
}

const PAGE_SIZE = 4

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
// ใช้รูปแบบฐานเดียวกันเสมอคือ
//   NEXT_PUBLIC_API_BASE_URL + "/uploads/profile-pictures/<fileName>"
// ไม่ว่า mediPicture จะเก็บเป็น URL เต็ม, path หรือแค่ชื่อไฟล์
function resolveImageUrl(path?: string | null): string | undefined {
  if (!path) return undefined

  // ดึงเฉพาะชื่อไฟล์จากค่าเดิม (รองรับทั้ง URL เต็ม, path และชื่อไฟล์ล้วน)
  const segments = path.split("/").filter(Boolean)
  const fileName = segments[segments.length - 1]
  if (!fileName) return undefined

  const relativePath = `uploads/profile-pictures/${fileName}`
  return apiUrl(relativePath)
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
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // โหลดรายการยาจริงจาก API /api/admin/v1/medicine/list
  async function reloadMedicines() {
    try {
      setIsLoading(true)
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
        apiUrl("/api/admin/v1/medicine/list?page=1&pageSize=1000"),
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
      }[]

      const next: MedicineRow[] = items.map((item) => {
        return {
          id: String(item.mediId),
          imageUrl: resolveImageUrl(item.mediPicture),
          genericNameTh: item.mediThName,
          genericNameEn: item.mediEnName,
          brandName: item.mediTradeName ?? "",
          usageType: item.mediType === "TOPICAL" ? "topical" : "oral",
          indications: "",
          instructions: "",
          adverseEffects: "",
          contraindications: "",
          precautions: "",
          storage: "",
        }
      })

      setMedicines(next)
      setCurrentPage(1)
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

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  function openCreateForm() {
    setEditingId("new")
    setFormValues(emptyForm)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function openEditForm(id: string) {
    const medicine = medicines.find((item) => item.id === id)
    if (!medicine) return

    setEditingId(id)
    setImagePreview(medicine.imageUrl ?? null)
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

      type MedicinePayload = {
        mediId: number
        mediThName: string
        mediEnName: string
        mediTradeName: string | null
        mediType: "ORAL" | "TOPICAL"
        mediUse?: string | null
        mediGuide?: string | null
        mediEffects?: string | null
        mediNoUse?: string | null
        mediWarning?: string | null
        mediStore?: string | null
        mediPicture?: string | null
      }

      const apiMedicine = (payload?.medicine ?? null) as
        | MedicinePayload
        | null

      if (!apiMedicine) {
        toast.error("บันทึกข้อมูลยาไม่สำเร็จ: รูปแบบข้อมูลไม่ถูกต้อง")
        return
      }

      const mapped: MedicineRow = {
        id: String(apiMedicine.mediId),
        imageUrl: resolveImageUrl(apiMedicine.mediPicture),
        genericNameTh: apiMedicine.mediThName,
        genericNameEn: apiMedicine.mediEnName,
        brandName: apiMedicine.mediTradeName ?? "",
        usageType: apiMedicine.mediType === "TOPICAL" ? "topical" : "oral",
        indications: apiMedicine.mediUse ?? data.indications,
        instructions: apiMedicine.mediGuide ?? data.instructions,
        adverseEffects: apiMedicine.mediEffects ?? data.adverseEffects,
        contraindications: apiMedicine.mediNoUse ?? data.contraindications,
        precautions: apiMedicine.mediWarning ?? data.precautions,
        storage: apiMedicine.mediStore ?? data.storage,
      }

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
  async function handleDelete(id: string) {
    const medicine = medicines.find((item) => item.id === id)
    const label =
      medicine &&
      `${medicine.genericNameEn} (${medicine.brandName})`

    const confirmed = window.confirm(
      label
        ? `ต้องการลบข้อมูลยา ${label} หรือไม่?`
        : "ต้องการลบข้อมูลยานี้หรือไม่?",
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
        const message =
          (payload && (payload.error as string | undefined)) ||
          "ไม่สามารถลบข้อมูลยาได้"
        window.alert(message)
        return
      }

      await reloadMedicines()
      setViewingMedicine((previous) =>
        previous && previous.id === id ? null : previous,
      )
    } catch (error) {
      console.error("Error deleting medicine:", error)
      window.alert("เกิดข้อผิดพลาดในการลบข้อมูลยา")
    }
  }

  function openViewDetails(id: string) {
    const medicine = medicines.find((item) => item.id === id)
    if (!medicine) return
    setViewingMedicine(medicine)
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
            <div className="flex w-full items-end gap-3 overflow-x-auto pb-1">
              <div className="flex flex-1 items-end justify-center gap-3">
                <div className="relative min-w-[320px] max-w-lg flex-1">
                  <Input
                    type="text"
                    placeholder="ค้นหาชื่อยา หรือชื่อการค้า"
                    value={searchTermInput}
                    onChange={(event) =>
                      setSearchTermInput(event.target.value)
                    }
                    className="h-9 w-full rounded-full bg-white/90 pr-10 text-xs text-slate-800 placeholder:text-slate-400 shadow-sm"
                  />
                  <button
                    type="button"
                    className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-sky-600 text-white shadow hover:bg-sky-700"
                    onClick={() => {
                      setUsageFilter(usageFilterInput)
                      setSearchTerm(searchTermInput)
                      setCurrentPage(1)
                    }}
                    aria-label="ค้นหาข้อมูลยา"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-600">
                    รูปแบบการใช้ยา
                  </span>
                  <Select
                    value={usageFilterInput}
                    onValueChange={(value) =>
                      setUsageFilterInput(value as "all" | UsageType)
                    }
                  >
                    <SelectTrigger className="h-9 w-auto rounded-full border-none bg-slate-900/80 px-4 text-xs font-medium text-white shadow-sm hover:bg-slate-900">
                      <SelectValue placeholder="ทั้งหมด" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value="all">ทั้งหมด</SelectItem>
                      <SelectItem value="oral">ยากิน</SelectItem>
                      <SelectItem value="topical">ยาใช้ภายนอก</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                size="sm"
                type="button"
                className="ml-10  rounded-full bg-emerald-500 px-4 text-xs font-semibold text-white shadow-md hover:bg-emerald-600"
                onClick={openCreateForm}
              >
                + เพิ่มยาใหม่
              </Button>
            </div>
          </DashboardPageHeader>
          <div className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
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
                            <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                              {imagePreview ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={imagePreview}
                                  alt="รูปภาพยา"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Pill className="h-8 w-8 text-slate-400" />
                              )}
                            </div>
                          </div>
                          <Input
                            type="file"
                            accept="image/png"
                            ref={fileInputRef}
                            onChange={(event) => {
                              const files = event.target.files
                              if (!files || files.length === 0) {
                                return
                              }

                              const file = files[0]

                              if (file.type !== "image/png") {
                                window.alert(
                                  "กรุณาเลือกรูปภาพนามสกุล PNG เท่านั้น",
                                )
                                event.target.value = ""
                                return
                              }

                              const url = URL.createObjectURL(file)
                              setImagePreview((previous) => {
                                if (previous && previous.startsWith("blob:")) {
                                  URL.revokeObjectURL(previous)
                                }
                                return url
                              })
                            }}
                            className="h-9 rounded-md border border-slate-200 bg-white text-xs file:mr-2 file:rounded-md file:border-none file:bg-slate-800 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-slate-900"
                          />
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
                            <SelectTrigger className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800">
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
              <Table className="border border-slate-200 rounded-xl bg-white">
                <TableHeader>
                  <TableRow className="bg-slate-700">
                    <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                      ชื่อสามัญยา
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                      ชื่อการค้า
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                      รูปแบบการใช้
                    </TableHead>
                    <TableHead className="px-4 py-3 text-center text-xs font-semibold text-white">
                      จัดการ
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMedicines.map((medicine) => (
                    <TableRow
                      key={medicine.id}
                      className="even:bg-slate-50/70"
                    >
                      <TableCell className="px-4 py-3 text-sm font-semibold text-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-200">
                            {medicine.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={medicine.imageUrl}
                                alt={medicine.genericNameEn}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src="/medicine-placeholder.svg"
                                alt="รูปยาตัวอย่าง"
                                className="h-full w-full object-cover"
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
                      <TableCell className="px-4 py-3 text-center text-sm text-slate-700">
                        {medicine.brandName}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center text-sm text-slate-700">
                        {USAGE_LABELS[medicine.usageType]}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDelete(medicine.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200"
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
                  {paginatedMedicines.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-6 text-center text-sm text-slate-500"
                      >
                        ไม่พบข้อมูลยาตามเงื่อนไขที่เลือก
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm font-medium text-slate-700">
                <span className="text-xs text-slate-500">
                  {isLoading ? (
                    <>กำลังโหลดข้อมูลยา...</>
                  ) : (
                    <>
                      พบข้อมูลยา{" "}
                      <span className="font-semibold text-slate-800">
                        {filteredMedicines.length}
                      </span>{" "}
                      รายการ · หน้า {safePage} จาก {totalPages}
                    </>
                  )}
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
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                      {viewingMedicine.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={viewingMedicine.imageUrl}
                          alt={viewingMedicine.genericNameEn}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src="/medicine-placeholder.svg"
                          alt="รูปยาตัวอย่าง"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
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
    </SidebarProvider>
  )
}
