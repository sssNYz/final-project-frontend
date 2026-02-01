"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { IconDotsVertical, IconLogout } from "@tabler/icons-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const [displayEmail, setDisplayEmail] = useState(user.email)

  useEffect(() => {
    if (typeof window === "undefined") return

    const storedEmail = window.localStorage.getItem("currentUserEmail")
    if (storedEmail) {
      // อ่านอีเมลจาก localStorage หลังจาก mount แล้วเท่านั้น
      // เพื่อไม่ให้ค่า server / client แตกต่างกันตอน hydration
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayEmail(storedEmail)
    }
  }, [])

  const displayName =
    (displayEmail ? displayEmail.split("@")[0] : null) ?? user.name
  const avatarInitial =
    displayName && displayName.length > 0
      ? displayName[0]?.toUpperCase()
      : "U"

  // ลบ token และข้อมูลผู้ใช้ใน localStorage แล้วพากลับไปหน้า login
  function handleLogout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("accessToken")
      window.localStorage.removeItem("refreshToken")
      window.localStorage.removeItem("currentUserEmail")
    }
    router.push("/")
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarFallback className="rounded-lg text-slate-900">
                  {avatarInitial}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs text-white">
                  {displayEmail}
                </span>
              </div>
              <IconLogout className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg text-slate-900">
                    {avatarInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {displayName}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {displayEmail}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={handleLogout}
              className="cursor-pointer bg-transparent text-red-600 focus:bg-transparent focus:outline-none data-[highlighted]:bg-transparent data-[highlighted]:text-red-600"
            >
              <IconLogout className="mr-1" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
