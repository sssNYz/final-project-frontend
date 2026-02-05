import type { Metadata } from "next"
import { Prompt } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { AlertProvider } from "@/components/ui/alert-modal"

const prompt = Prompt({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
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
        className={`${prompt.variable} antialiased bg-background text-foreground`}
      >
        <AlertProvider>{children}</AlertProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
