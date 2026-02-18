"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { IconDotsVertical, IconLogout } from "@tabler/icons-react"

import { apiFetch, clearAuthCache } from "@/lib/apiClient"

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

  const avatarInitial =
    displayEmail && displayEmail.length > 0
      ? displayEmail[0]?.toUpperCase()
      : "U"

  function handleLogout() {
    clearAuthCache()
    void apiFetch("/api/auth/v2/logout", {
      method: "POST",
      skipAuth: true,
      skipAuthRedirect: true,
    })
    router.push("/")
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="cursor-pointer hover:bg-transparent hover:text-inherit active:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-inherit focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarFallback className="rounded-lg text-slate-900">
                  {avatarInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left text-sm leading-tight text-white">
                <span className="break-all text-sm font-medium">
                  {displayEmail}
                </span>
              </div>
              <IconLogout className="ml-auto size-4 text-white/70 transition-colors hover:text-white" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-auto min-w-24 rounded-lg"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuItem
              onSelect={handleLogout}
              className="group cursor-pointer bg-transparent text-red-600 focus:bg-transparent focus:outline-none data-[highlighted]:bg-transparent data-[highlighted]:text-red-600"
            >
              <IconLogout className="mr-1 transition-colors group-hover:text-red-700" />
              ออกจากระบบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
