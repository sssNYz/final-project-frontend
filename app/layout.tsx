import type { Metadata } from "next"
import { Noto_Sans_Thai_Looped } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { AlertProvider } from "@/components/ui/alert-modal"

const myfontSan = Noto_Sans_Thai_Looped({
  subsets: ["thai", "latin"],
  variable: "--font-noto_Sans_Thai_Looped-sans",
})

const myfontMono = Noto_Sans_Thai_Looped({
  subsets: ["thai", "latin"],
  variable: "--font-noto_Sans_Thai_Looped-mono",
})

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
        className={`${myfontSan.variable} ${myfontMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <AlertProvider>{children}</AlertProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
