"use client"

import { APP_NAME } from "@/lib/config"
import { getNavItemsForRole } from "@/lib/navigation"
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
  LogOut,
  Settings,
  Menu,
  X,
  Loader2,
  Clock,
  Home,
  CheckSquare,
  Calendar
} from "lucide-react"
import { UserProfileCard } from "./user-profile-card"
import { ProfileSettingsModal } from "./profile-settings-modal"
import { MyDayView } from "@/components/dashboard-views/my-day-view"
import { MeetingsView } from "@/components/dashboard-views/meetings-view"
import { NotificationBell } from "@/components/notification-bell"
import { ThemeToggle } from "./theme-toggle"
import { MobileBottomNav } from "./mobile-bottom-nav"
import { getTimeBasedGreeting, getFormattedDate } from "@/lib/time-utils"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"
import { CreateSelfTaskModal } from "@/components/modals/create-self-task-modal"
import { TeamTasksView } from "@/components/dashboard-views/team-tasks-view"

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  due_date: string
  estimated_hours: number | null
  elapsed_minutes?: number
  completed_at?: string
  completion_notes?: string
  project_id?: string | null
  is_self_created?: boolean
  approval_status?: "auto_approved" | "pending" | "approved" | "rejected"
}

interface TimeLog {
  id: string
  clock_in: string
  clock_out: string | null
  duration_minutes: number
  task_id?: string
}

interface Profile {
  full_name: string
  email: string
  role: string
  avatar_url: string | null
}

export function TeamMemberDashboard({
  userId,
  userName,
}: {
  userId: string
  userName: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([])
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [todayHours, setTodayHours] = useState(0)
  const [currentClockInTime, setCurrentClockInTime] = useState<string | null>(null)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [activeView, setActiveView] = useState<"my-day" | "tasks" | "meetings" | "profile">("my-day")

  const loadData = useCallback(async () => {
    try {
      const resProfile = await fetch("/api/profile")
      if (resProfile.ok) {
        const profileData = await resProfile.json()
        setProfile(profileData)
      }

      const { data: tasksData } = await supabase
        .from("tasks")
        .select("*")
        .or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
        .order("created_at", { ascending: false })

      setTasks(tasksData || [])

      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, name")
        .order("name", { ascending: true })

      setProjects(projectsData || [])

      const today = new Date().toISOString().split("T")[0]
      const { data: logsData } = await supabase
        .from("time_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("clock_in", today)

      setTimeLogs(logsData || [])

      const hours = (logsData || []).reduce((acc, log) => {
        return acc + (log.duration_minutes || 0)
      }, 0)
      setTodayHours(Math.round((hours / 60) * 100) / 100)

      const activeLog = (logsData || []).find((log) => !log.clock_out)
      setIsClockedIn(!!activeLog)
      setCurrentClockInTime(activeLog?.clock_in || null)

      if (activeLog?.task_id) {
        setActiveTaskId(activeLog.task_id)
      }

      setLoading(false)
    } catch (error) {
      console.error("Error loading data:", error)
      setLoading(false)
    }
  }, [supabase, userId])

  useEffect(() => {
    loadData()
  }, [])

  useRealtimeSubscription("tasks", loadData)
  useRealtimeSubscription("time_logs", loadData)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const menuItems = getNavItemsForRole(profile?.role as any)

  const mobileNavItems = [
    { id: "my-day", label: "My Day", icon: Home },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "meetings", label: "Meetings", icon: Calendar },
  ]

  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop only */}
      <div className={`
        fixed md:relative z-50 h-full
        transition-all duration-300 ease-out
        bg-card/95 dark:bg-card/90 backdrop-blur-xl border-r border-border shadow-2xl md:shadow-lg flex flex-col
        ${isSidebarOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0 md:w-20 lg:w-72"}
      `}>
        <div className="p-4 flex items-center justify-between h-16 border-b border-border">
          <h2 className={`font-bold text-primary truncate text-lg ${!isSidebarOpen && "md:hidden lg:block"}`}>
            {APP_NAME}
          </h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2.5 hover:bg-muted rounded-xl md:hidden transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {/* Timer Widget */}
          <div className={`mb-6 p-4 glass-card rounded-2xl ${!isSidebarOpen && "md:hidden lg:block"}`}>
            <div className="flex items-center gap-2 mb-2 text-primary">
              <Clock size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">Time Today</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{todayHours} <span className="text-sm font-normal text-muted-foreground">hrs</span></div>
            {isClockedIn ? (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Clocked In
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mt-1">Clocked Out</div>
            )}
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id as any)
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
            onClick={() => setShowProfileSettings(true)}
            className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 min-h-[48px]"
            title="Settings"
          >
            <Settings size={20} className="shrink-0 transition-colors" />
            <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"} text-sm font-medium`}>Settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 transition-all duration-200 min-h-[48px]"
            title="Sign Out"
          >
            <LogOut size={20} className="shrink-0 transition-colors" />
            <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"} text-sm font-medium`}>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gradient-to-br from-slate-50 via-slate-50 to-emerald-50/30 dark:from-slate-950 dark:via-slate-950 dark:to-emerald-950/20">
        {/* Header */}
        <header className="bg-card/80 dark:bg-card/60 backdrop-blur-xl border-b border-border shadow-sm h-16 flex-shrink-0 z-30">
          <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2.5 -ml-2 hover:bg-muted rounded-xl md:hidden text-foreground transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Menu size={22} />
              </button>

              <div className="flex flex-col">
                <h1 className="text-lg md:text-xl font-bold text-foreground leading-tight truncate">
                  {APP_NAME}
                </h1>
                <p className="text-xs text-muted-foreground hidden md:block">
                  Welcome back, <span className="font-medium text-foreground">{userName}</span> • <span className="text-primary font-medium">{getFormattedDate()}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <NotificationBell userId={userId} isAdmin={false} />
              <div className="flex-shrink-0 hidden sm:block">
                {profile && (
                  <UserProfileCard
                    fullName={profile.full_name}
                    email={profile.email}
                    role={profile.role}
                    avatarUrl={profile.avatar_url || undefined}
                    compact={true}
                  />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-6 w-full relative pb-24 md:pb-6">
          <div className="md:hidden mb-4">
            <p className="text-sm text-muted-foreground">
              {getTimeBasedGreeting(userName)}
            </p>
          </div>

          {activeView === "my-day" ? (
            <MyDayView userId={userId} userName={userName} />
          ) : activeView === "meetings" ? (
            <MeetingsView />
          ) : activeView === "tasks" ? (
            <TeamTasksView
              userId={userId}
              userName={userName}
              onDataChange={loadData}
            />
          ) : null}
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          activeView={activeView}
          onViewChange={(view) => setActiveView(view as any)}
          items={mobileNavItems}
        />

        {/* Profile Settings Modal */}
        {showProfileSettings && (
          <ProfileSettingsModal
            userId={userId}
            isAdmin={false}
            initialProfile={profile}
            onClose={() => setShowProfileSettings(false)}
            onSuccess={() => {
              setShowProfileSettings(false)
              loadData()
            }}
          />
        )}

        {/* Create Self Task Modal */}
        {showCreateTask && (
          <CreateSelfTaskModal
            open={showCreateTask}
            onOpenChange={setShowCreateTask}
            onSuccess={loadData}
          />
        )}
      </div>
    </div>
  )
}
