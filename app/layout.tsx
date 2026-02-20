import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { AlertProvider } from "@/components/ui/alert-modal"
import { AuthRefresh } from "@/components/auth-refresh"

export const metadata: Metadata = {
  title: "MediBuddy Admin",
  description: "Administration panel for MediBuddy",
}

// Layout หลักของแอป ใช้ห่อทุกหน้าของ Next.js
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className="font-sans antialiased bg-background text-foreground"
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
