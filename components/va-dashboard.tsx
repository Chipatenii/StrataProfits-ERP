"use client"

import { APP_NAME } from "@/lib/config"
import { getNavItemsForRole } from "@/lib/navigation"
import { useState } from "react"
import { LayoutDashboard, DollarSign, FolderKanban, FileText, Book, LogOut, Menu, X } from "lucide-react"
import { getTimeBasedGreeting } from "@/lib/time-utils"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { VAOverview } from "@/components/dashboard-views/va-overview"
import { VAFinance } from "@/components/dashboard-views/va-finance"
import { VASOPs } from "@/components/dashboard-views/va-sops"
import { PipelineView } from "@/components/dashboard-views/pipeline-view"
import { ProjectListView } from "@/components/projects/project-list-view"
import { TasksView } from "@/components/dashboard-views/tasks-view"
import { MeetingsView } from "@/components/dashboard-views/meetings-view"
import { UserProfileCard } from "./user-profile-card"

interface VADashboardProps {
  userId: string
  userName: string
  userEmail: string
  userRole: string
}

type View = "overview" | "tasks" | "meetings" | "pipeline" | "projects" | "finance" | "sops"

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
        return <VAOverview userId={userId} userName={userName} />
      case "tasks":
        return <TasksView userId={userId} userName={userName} />
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
        return <VAOverview userId={userId} userName={userName} />
    }
  }

  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      {/* Mobile Overlay Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative z-50 h-full
        transition-all duration-300 ease-in-out
        bg-card border-r border-border
        ${isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0 md:w-20 lg:w-64"}
      `}>
        <div className="p-4 flex items-center justify-between h-16 border-b border-border/10">
          <h2 className={`font-bold text-accent truncate text-lg ${!isSidebarOpen && "md:hidden lg:block"}`}>
            Ostento VA
          </h2>
          {/* Close button only visible on mobile when open */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-accent/10 rounded-lg md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="space-y-1 p-3 mt-4 overflow-y-auto h-[calc(100vh-8rem)]">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id as View)
                  if (window.innerWidth < 768) setIsSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${activeView === item.id ? "bg-accent text-white" : "text-muted-foreground hover:bg-accent/10"
                  }`}
                title={item.label}
              >
                <Icon size={22} className="shrink-0" />
                <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"} transition-opacity duration-200`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>

        <div className="absolute bottom-4 left-0 right-0 px-3">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
            title="Sign Out"
          >
            <LogOut size={22} className="shrink-0" />
            <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"}`}>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background/95">
        {/* Header - Slim Mobile First */}
        <header className="bg-white border-b border-border shadow-sm h-16 flex-shrink-0 z-30">
          <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* Hamburger - Only visible on mobile */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 hover:bg-accent/10 rounded-lg md:hidden text-foreground"
              >
                <Menu size={24} />
              </button>

              <div className="flex flex-col">
                <h1 className="text-lg md:text-xl font-bold text-foreground leading-tight truncate">
                  <span className="md:hidden">{APP_NAME}</span>
                  <span className="hidden md:inline">{APP_NAME}</span>
                </h1>
                <p className="text-xs text-muted-foreground hidden md:block">Welcome, {userName}</p>
              </div>
            </div>

            {/* Profile - Compact on Mobile */}
            <div className="flex-shrink-0">
              <UserProfileCard
                fullName={userName}
                email={userEmail}
                role={userRole}
                compact={true}
              />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-6 w-full relative">
          {/* Mobile Greeting (if hidden in header) */}
          <div className="md:hidden mb-4">
            <p className="text-sm text-muted-foreground">{getTimeBasedGreeting(userName)}</p>
          </div>

          {renderView()}
        </main>
      </div>
    </div>
  )
}
