"use client"

import { cn } from "@/lib/utils"

type DashboardPageHeaderProps = {
  title: string
  description?: string
  titleClassName?: string
  className?: string
  children?: React.ReactNode
}

// Header มุมบนของแต่ละหน้าใน Dashboard
// แสดงชื่อหน้าหลัก (title) และคำอธิบายสั้น ๆ (description)
export function DashboardPageHeader({
  title,
  description,
  titleClassName,
  className,
  children,
}: DashboardPageHeaderProps) {
  return (
    <header
      className={cn(
        "border-b border-slate-200/80 bg-slate-900/3 px-4 py-4 backdrop-blur-sm lg:px-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            className={cn(
              "text-lg font-semibold tracking-tight text-slate-900",
              titleClassName,
            )}
          >
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs text-slate-600">
              {description}
            </p>
          )}
        </div>
        <div className="flex flex-1 items-center justify-end gap-2 md:flex-none">
          {children}
        </div>
      </div>
    </header>
  )
}
