"use client"

import { useState } from "react"
import { LayoutDashboard, DollarSign, FolderKanban, FileText, Book, LogOut, Menu, X } from "lucide-react"
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
}

type View = "overview" | "tasks" | "meetings" | "pipeline" | "projects" | "finance" | "sops"

export function VADashboard({ userId, userName }: VADashboardProps) {
  const [activeView, setActiveView] = useState<View>("overview")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const menuItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "tasks", label: "Tasks", icon: FolderKanban },
    { id: "meetings", label: "Meetings", icon: FileText },
    { id: "pipeline", label: "Sales Pipeline", icon: DollarSign },
    { id: "projects", label: "Projects", icon: FolderKanban },
    { id: "finance", label: "Finance", icon: DollarSign },
    { id: "sops", label: "SOPs", icon: Book },
  ]

  const renderView = () => {
    switch (activeView) {
      case "overview":
        return <VAOverview userId={userId} />
      case "tasks":
        return <TasksView userId={userId} role="virtual_assistant" />
      case "meetings":
        return <MeetingsView userId={userId} role="virtual_assistant" />
      case "pipeline":
        return <PipelineView userId={userId} />
      case "projects":
        return <ProjectListView userId={userId} />
      case "finance":
        return <VAFinance userId={userId} />
      case "sops":
        return <VASOPs userId={userId} />
      default:
        return <VAOverview userId={userId} />
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={`${isSidebarOpen ? "w-64" : "w-20"} transition-all duration-300 bg-card border-r border-border`}>
        <div className="p-4 flex items-center justify-between">
          <h2 className={`font-bold text-accent ${!isSidebarOpen && "hidden"}`}>Ostento VA</h2>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-accent/10 rounded-lg">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="space-y-2 px-3 mt-8">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id as View)
                  setIsSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  activeView === item.id ? "bg-accent text-white" : "text-muted-foreground hover:bg-accent/10"
                }`}
              >
                <Icon size={20} />
                <span className={`${!isSidebarOpen && "hidden"}`}>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="absolute bottom-4 left-0 right-0 px-3">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={20} />
            <span className={`${!isSidebarOpen && "hidden"}`}>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-border shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Ostento Productivity Tracker</h1>
              <p className="text-sm text-muted-foreground">Welcome, {userName}</p>
            </div>
            <UserProfileCard userId={userId} />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">{renderView()}</main>
      </div>
    </div>
  )
}
