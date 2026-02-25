"use client"

import { NavUser } from "@/components/nav-user"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { getLoggedInUserEmail } from "@/lib/authUser"

const headerUser = {
  name: "admin",
  email: "m@example.com",
  avatar: "/avatars/shadcn.svg",
}

// Header ด้านบนของหน้า Dashboard แสดงโลโก้ ปุ่มเปิด Sidebar และข้อมูลผู้ใช้
export function SiteHeader() {
  const email = getLoggedInUserEmail() ?? headerUser.email

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b border-slate-900/10 bg-gradient-to-r from-slate-900 via-sky-800 to-sky-500 text-white shadow-sm transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-2 px-4 lg:gap-3 lg:px-6">
        <SidebarTrigger className="-ml-1 text-white/90 hover:text-white" />
        <Separator
          orientation="vertical"
          className="mx-1 h-6 border-white/30 data-[orientation=vertical]:h-6"
        />
        <div className="flex flex-col">
          <h1 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
            MediBuddy Admin
          </h1>
          <p className="text-xs text-white/80">
            ระบบจัดการข้อมูลยาและผู้ใช้งาน
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 pr-2">
          <NavUser user={{ ...headerUser, email }} />
        </div>
      </div>
    </header>
  )
}
