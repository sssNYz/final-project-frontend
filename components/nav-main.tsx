"use client"

import { usePathname } from "next/navigation"
import { type Icon } from "@tabler/icons-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url?: string
    icon?: Icon
    children?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()

  // เมนูหลักใน Sidebar สำหรับนำทางไปยังหน้าต่าง ๆ ของ Dashboard
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-1.5">
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              item.url && pathname
                ? pathname === item.url ||
                  (item.url !== "/dashboard" &&
                    pathname.startsWith(item.url))
                : false

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={Boolean(isActive)}
                  size="lg"
                  className="data-[active=true]:bg-gradient-to-r data-[active=true]:from-slate-900 data-[active=true]:via-sky-800 data-[active=true]:to-sky-500 data-[active=true]:text-white data-[active=true]:shadow-sm hover:bg-slate-900/80 hover:text-slate-50"
                >
                  <a href={item.url ?? "#"}>
                    {item.icon && (
                      <item.icon className="text-slate-300" />
                    )}
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
                {item.children && item.children.length > 0 && (
                  <SidebarMenuSub>
                    {item.children.map((child) => {
                      const isChildActive = Boolean(
                        pathname && pathname.startsWith(child.url),
                      )

                      return (
                        <SidebarMenuSubItem key={child.title}>
                          <SidebarMenuSubButton
                            asChild
                            size="md"
                            isActive={isChildActive}
                          >
                            <a href={child.url}>{child.title}</a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
