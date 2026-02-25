"use client"

import * as React from "react"
import Image from "next/image"
import {
  IconChartBar,
  IconDatabase,
  IconListDetails,
  IconUsers,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.svg",
  },
  mainNav: [
    {
      title: "บัญชีผู้ใช้งาน",
      url: "/accounts",
      icon: IconUsers,
      children: [
        {
          title: "เพิ่มบัญชีผู้ดูแลระบบ",
          url: "/accounts/new-admin",
        },
      ],
    },
    {
      title: "ข้อมูลยา",
      url: "/medicines",
      icon: IconDatabase,
    },
    {
      title: "ปริมาณข้อมูล",
      url: "/dashboard",
      icon: IconChartBar,
    },
    {
      title: "รายการคำร้อง",
      url: "/requests",
      icon: IconListDetails,
    },
  ],
}

// Sidebar หลักของหน้า Dashboard ฝั่งแอดมิน
// แสดงเมนูนำทางไปยังหน้าจัดการบัญชีผู้ใช้, ข้อมูลยา, ปริมาณข้อมูล และรายการคำร้อง
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-r border-slate-200 bg-gradient-to-b from-slate-950 via-slate-800 to-slate-900 text-slate-100"
      {...props}
    >
      <SidebarHeader className="px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="data-[slot=sidebar-menu-button]:!p-2 bg-slate-900/60 text-slate-50 shadow-sm hover:bg-slate-800/80"
            >
              <a href="/dashboard" aria-label="กลับไปหน้า Dashboard">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/90 bg-white">
                    <Image
                      src="/assets/Icon_MediBuddy_v2.png"
                      alt="MediBuddy"
                      width={26}
                      height={26}
                      className="h-10 w-10 rounded-full object-contain"
                    />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold leading-tight">
                      MediBuddy Admin
                    </span>
                  </div>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-2 pb-4 pt-1">
        <NavMain items={data.mainNav} />
      </SidebarContent>
    </Sidebar>
  )
}
