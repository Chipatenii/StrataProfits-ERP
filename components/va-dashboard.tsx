"use client"

import { APP_NAME } from "@/lib/config"
import { getNavItemsForRole } from "@/lib/navigation"
import { useState } from "react"
import { LogOut, Menu, X } from "lucide-react"
import { getTimeBasedGreeting, getFormattedDate } from "@/lib/time-utils"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { VAOverview } from "@/components/dashboard-views/va-overview"
import { VAFinance } from "@/components/dashboard-views/va-finance"
import { VASOPs } from "@/components/dashboard-views/va-sops"
import { PipelineView } from "@/components/dashboard-views/pipeline-view"
import { ProjectListView } from "@/components/projects/project-list-view"
import { TeamTasksView } from "@/components/dashboard-views/team-tasks-view"
import { MeetingsView } from "@/components/dashboard-views/meetings-view"
import { ClientsView } from "@/components/dashboard-views/clients-view"
import { SalesView } from "@/components/dashboard-views/sales-view"
import { UserProfileCard } from "./user-profile-card"
import { ThemeToggle } from "./theme-toggle"
import { NotificationBell } from "./notification-bell"

interface VADashboardProps {
  userId: string
  userName: string
  userEmail: string
  userRole: string
}

type View = "overview" | "tasks" | "meetings" | "pipeline" | "projects" | "finance" | "sops" | "clients" | "sales"

export function VADashboard({ userId, userName, userEmail, userRole }: VADashboardProps) {
  const [activeView, setActiveView] = useState<View>("overview")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const menuItems = getNavItemsForRole(userRole as any)

  const renderView = () => {
    switch (activeView) {
      case "overview":
        return <VAOverview userId={userId} userName={userName} onViewChange={(view) => setActiveView(view as View)} />
      case "clients":
        return <ClientsView />
      case "sales":
        return <SalesView />
      case "tasks":
        return <TeamTasksView userId={userId} userName={userName} />
      case "meetings":
        return <MeetingsView />
      case "pipeline":
        return <PipelineView />
      case "projects":
        return <ProjectListView userId={userId} />
      case "finance":
        return <VAFinance userName={userName} userRole={userRole} />
      case "sops":
        return <VASOPs />
      default:
        return <VAOverview userId={userId} userName={userName} onViewChange={(view) => setActiveView(view as View)} />
    }
  }

  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      {/* Mobile Overlay Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative z-50 h-full
        transition-all duration-300 ease-out
        bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl md:shadow-xl flex flex-col
        ${isSidebarOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0 md:w-20 lg:w-72"}
      `}>
        {/* Premium Branded Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_50%)]" />
          <div className="relative p-4 flex items-center justify-between h-20">
            <div className={`flex items-center gap-3 ${!isSidebarOpen && "md:hidden lg:flex"}`}>
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg border border-white/30 shadow-lg">
                VA
              </div>
              <div className="text-white">
                <h2 className="font-bold text-lg leading-tight">Virtual Assistant</h2>
                <p className="text-xs text-blue-100/80">StrataProfits ERP</p>
              </div>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2.5 hover:bg-white/20 rounded-xl md:hidden transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id as View)
                  if (window.innerWidth < 768) setIsSidebarOpen(false)
                }}
                className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 min-h-[48px]
                  ${isActive
                    ? "bg-primary/10 text-primary font-semibold shadow-sm dark:bg-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                title={item.label}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={`shrink-0 transition-colors ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
                />
                <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"} transition-opacity duration-200 flex-1 text-left text-sm`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-1">
          <button
            onClick={handleSignOut}
            className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 transition-all duration-200 min-h-[48px]"
            title="Sign Out"
          >
            <LogOut size={20} className="shrink-0 transition-colors" />
            <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"} text-sm font-medium`}>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-cyan-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950/30">
        {/* Header - Premium */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-lg shadow-black/5 dark:shadow-black/20 h-18 flex-shrink-0 z-30">
          <div className="h-full px-4 md:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2.5 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl md:hidden text-foreground transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Menu size={22} />
              </button>

              <div className="flex flex-col">
                <h1 className="text-lg md:text-xl font-bold text-foreground leading-tight truncate">
                  {APP_NAME}
                </h1>
                <p className="text-xs text-muted-foreground hidden md:block">
                  Welcome back, <span className="font-medium text-foreground">{userName}</span> • <span className="text-cyan-600 dark:text-cyan-400 font-medium">{getFormattedDate()}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <ThemeToggle />
              <NotificationBell userId={userId} isAdmin={false} />
              <div className="flex-shrink-0 hidden sm:block">
                <UserProfileCard
                  fullName={userName}
                  email={userEmail}
                  role={userRole}
                  compact={true}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-6 w-full relative pb-20 md:pb-6">
          <div className="md:hidden mb-4">
            <p className="text-sm text-muted-foreground">{getTimeBasedGreeting(userName)}</p>
          </div>

          {renderView()}
        </main>
      </div>
    </div>
  )
}
