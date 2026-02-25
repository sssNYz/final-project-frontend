import type { Metadata } from "next"
import { Pridi } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { AlertProvider } from "@/components/ui/alert-modal"
import { AuthRefresh } from "@/components/auth-refresh"

export const metadata: Metadata = {
  title: "MediBuddy Admin",
  description: "Administration panel for MediBuddy",
}

const myfontSans = Pridi({
  subsets: ["thai", "latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
  variable: "--font-app-sans",
  display: "swap",
})

const myfontMono = Pridi({
  subsets: ["thai", "latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
})

// Layout หลักของแอป ใช้ห่อทุกหน้าของ Next.js
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className=
        {`${myfontSans.className}
          ${myfontMono.variable}
        antialiased bg-background text-foreground`}
      >
        <AlertProvider>
          <AuthRefresh />
          {children}
        </AlertProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
