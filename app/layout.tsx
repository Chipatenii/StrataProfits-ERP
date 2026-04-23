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
  themeColor: "#059669",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/apple-icon.png",
    shortcut: "/icon.svg",
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
