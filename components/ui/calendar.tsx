 "use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"

import { cn } from "@/lib/utils"

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

type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  /** แสดงปี พ.ศ. ในหัวปฏิทิน */
  buddhistYear?: boolean
}

export function Calendar({
  className,
  classNames,
  buddhistYear = true,
  ...props
}: CalendarProps) {
  const [mounted, setMounted] = React.useState(false)
  const mode = props.mode ?? "single"

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // หลีกเลี่ยง hydration mismatch จากการเรนเดอร์ปฏิทินที่ใช้ Date/Intl บนฝั่งเซิร์ฟเวอร์
  if (!mounted) {
    return null
  }

  const handleClear = () => {
    if (!props.onSelect) return
    if (mode === "range") {
      ;(props.onSelect as (value: { from?: Date; to?: Date } | undefined) => void)(
        undefined,
      )
      return
    }
    if (mode === "multiple") {
      ;(props.onSelect as (value: Date[] | undefined) => void)([])
      return
    }
    ;(props.onSelect as (value: Date | undefined) => void)(undefined)
  }

  const handleToday = () => {
    if (!props.onSelect) return
    const today = new Date()
    if (mode === "range") {
      ;(props.onSelect as (value: { from?: Date; to?: Date } | undefined) => void)({
        from: today,
        to: today,
      })
      return
    }
    if (mode === "multiple") {
      ;(props.onSelect as (value: Date[] | undefined) => void)([today])
      return
    }
    ;(props.onSelect as (value: Date | undefined) => void)(today)
  }

  return (
    <DayPicker
      className={cn("p-3", className)}
      classNames={{
        caption: "flex items-center justify-center gap-2 pb-2",
        caption_label: "text-sm font-medium",
        caption_dropdowns: "flex items-center gap-2",
        dropdown: "inline-flex h-8 items-center rounded-md border bg-background px-2 text-xs",
        head_row: "flex",
        head_cell:
          "flex-1 text-center text-[11px] font-semibold text-muted-foreground",
        row: "flex mt-1",
        day: cn(
          "h-8 w-8 p-0 text-xs rounded-full transition-colors",
          "hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        ),
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
        day_today:
          "border border-primary text-primary font-semibold",
        day_outside:
          "text-muted-foreground opacity-60 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled:
          "text-muted-foreground opacity-40 line-through cursor-not-allowed",
        ...classNames,
      }}
      footer={
        <div className="mt-3 flex items-center justify-between px-1 text-[11px] text-slate-600">
          <button
            type="button"
            onClick={handleClear}
            className="rounded-full px-2 py-1 transition hover:bg-slate-100"
          >
            ล้างค่า
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="rounded-full px-2 py-1 font-semibold text-sky-700 transition hover:bg-slate-100"
          >
            วันนี้
          </button>
        </div>
      }
      formatters={{
        formatCaption: (month) => {
          const year = month.getFullYear()
          const beYear = buddhistYear ? year + 543 : year
          const monthName =
            thaiMonths[month.getMonth()] ??
            month.toLocaleDateString("th-TH", {
              month: "long",
            })

          return `${monthName} ${beYear}`
        },
      }}
      locale={new Intl.Locale("th-TH-u-ca-buddhist")}
      {...props}
    />
  )
}
