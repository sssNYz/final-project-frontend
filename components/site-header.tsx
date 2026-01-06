"use client"

import { NavUser } from "@/components/nav-user"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const headerUser = {
  name: "admin",
  email: "m@example.com",
  avatar: "/avatars/shadcn.jpg",
}

// Header ด้านบนของหน้า Dashboard แสดงโลโก้ ปุ่มเปิด Sidebar และข้อมูลผู้ใช้
export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-gradient-to-r from-slate-600 to-sky-600 text-white transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 text-white" />
        <Separator
          orientation="vertical"
          className="mx-2 h-6 border-white/40 data-[orientation=vertical]:h-6"
        />
        <h1 className="text-lg font-bold tracking-wide">MediBuddy</h1>
        <div className="ml-auto flex items-center gap-2 pr-2">
          <NavUser user={headerUser} />
        </div>
      </div>
    </header>
  )
}
