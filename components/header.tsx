"use client"

import { useState, useEffect } from "react"
import { Menu, X, LogOut, LayoutDashboard, FileText, Users, MessageSquare } from "lucide-react"
import { APP_NAME } from "@/lib/config"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { NotificationBell } from "@/components/notification-bell"
import { ChatPanel } from "@/components/chat/chat-panel"

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      setIsAdmin(profile?.role === "admin")
      setIsClient(profile?.role === "client")
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const navItems = isClient ? [
    { label: "Portal", href: "/client-portal", icon: LayoutDashboard },
  ] : [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ...(isAdmin ? [
      { label: "Reports", href: "/reports", icon: FileText },
      { label: "Team", href: "/team", icon: Users },
    ] : []),
  ]

  return (
    <>
      <header className="border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center">
                <span className="text-white font-bold text-sm">{APP_NAME.charAt(0)}</span>
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight tracking-tight">{APP_NAME}</h1>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">ERP Platform</p>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="flex items-center gap-2">
              {user && (
                <>
                  <NotificationBell userId={user.id} isAdmin={isAdmin} />
                  {!isClient && (
                    <button onClick={() => setIsChatOpen(true)} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors" title="Chat">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  )}
                  <div className="hidden md:block w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />
                  <button
                    onClick={handleLogout}
                    className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </>
              )}

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div className="md:hidden pt-3 pb-1 border-t border-slate-200 dark:border-slate-800 mt-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                )
              })}
              {user && (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {user && !isClient && (
        <ChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          userId={user.id}
        />
      )}
    </>
  )
}
