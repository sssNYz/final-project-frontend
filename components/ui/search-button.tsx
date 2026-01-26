import * as React from "react"

import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"

type SearchButtonProps = React.ComponentProps<typeof Button>

export function SearchButton({
  className,
  children = "ค้นหา",
  ...props
}: SearchButtonProps) {
  return (
    <Button
      className={cn(
        "h-9 rounded-md bg-red-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-red-700",
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  )
}
