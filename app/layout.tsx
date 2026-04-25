import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { APP_NAME } from "@/lib/config"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { SWRProvider } from "@/components/swr-provider"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Enterprise Resource Planning System",
  generator: 'v0.app',
  manifest: "/manifest.json",
  themeColor: "#1e3a8a",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    shortcut: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <SWRProvider>
            {children}
            <Toaster richColors position="top-right" />
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
