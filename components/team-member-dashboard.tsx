"use client"

import { APP_NAME } from "@/lib/config"
import { getNavItemsForRole } from "@/lib/navigation"
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
  LogOut,
  Settings,
  CheckCircle,
  Menu,
  X,
  Loader2,
  Pause,
  Play,
  Plus,
  Clock,
  Sun,
  List,
  DollarSign,
  Briefcase
} from "lucide-react"
import { Timer } from "./timer"
import { TimerNotification } from "./timer-notification"
import { UserProfileCard } from "./user-profile-card"
import { ProfileSettingsModal } from "./profile-settings-modal"
import { MyDayView } from "@/components/dashboard-views/my-day-view"
import { PipelineView } from "@/components/dashboard-views/pipeline-view"
import { MeetingsView } from "@/components/dashboard-views/meetings-view"
import { TimeAllocationIndicator } from "@/components/time-allocation-indicator"
import { TaskCompletionModal } from "@/components/modals/task-completion-modal"
import { NotificationBell } from "@/components/notification-bell"
import { calculateTimeSpent, getTimeBasedGreeting, getFormattedDate, getFormattedTime } from "@/lib/time-utils"
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
  const [completingTask, setCompletingTask] = useState<Task | null>(null)
  const [animatingTaskId, setAnimatingTaskId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active")
  const [projectFilter, setProjectFilter] = useState<string>("all")
  const [stats, setStats] = useState<{
    leaderboard: any[]
    bestPerformer: any
  } | null>(null)
  const [timerNotification, setTimerNotification] = useState<{
    type: "warning" | "elapsed"
    taskTitle: string
    remainingMinutes?: number
  } | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [activeView, setActiveView] = useState<"my-day" | "tasks" | "meetings">("my-day")

  // Filters are now handled inside TeamTasksView for better performance and separation


  const loadData = useCallback(async () => {
    try {
      // Fetch profile via API (bypasses RLS) - Restore Fix
      const resProfile = await fetch("/api/profile")
      if (resProfile.ok) {
        const profileData = await resProfile.json()
        setProfile(profileData)
      }

      // Get assigned tasks AND self-created tasks
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("*")
        .or(`assigned_to.eq.${userId},created_by.eq.${userId}`) // Modified to include self-created
        .order("created_at", { ascending: false })

      setTasks(tasksData || [])

      // Get projects user is part of (RLS handles filtering)
      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, name")
        .order("name", { ascending: true })

      setProjects(projectsData || [])

      // Get today's time logs
      const today = new Date().toISOString().split("T")[0]
      const { data: logsData } = await supabase
        .from("time_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("clock_in", today)

      setTimeLogs(logsData || [])

      // Calculate today's hours
      const hours = (logsData || []).reduce((acc, log) => {
        return acc + (log.duration_minutes || 0)
      }, 0)
      setTodayHours(Math.round((hours / 60) * 100) / 100)

      // Check if currently clocked in
      const activeLog = (logsData || []).find((log) => !log.clock_out)
      setIsClockedIn(!!activeLog)
      setCurrentClockInTime(activeLog?.clock_in || null)

      if (activeLog?.task_id) {
        setActiveTaskId(activeLog.task_id)
      }

      setLoading(false)

      // Load stats
      const statsResponse = await fetch("/api/team/stats")
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error("Error loading data:", error)
      setLoading(false)
    }
  }, [supabase, userId])

  useEffect(() => {
    loadData()
  }, [])

  // Real-time subscriptions
  useRealtimeSubscription("tasks", loadData)
  useRealtimeSubscription("time_logs", loadData)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    )
  }

  const menuItems = getNavItemsForRole(profile?.role as any)

  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      {/* Mobile Overlay */}
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
          bg-white border-r border-slate-200 shadow-xl md:shadow-none flex flex-col
          ${isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0 md:w-20 lg:w-64"}
        `}>
        <div className="p-4 flex items-center justify-between h-16 border-b border-border/10">
          <h2 className={`font-bold text-accent truncate text-lg ${!isSidebarOpen && "md:hidden lg:block"}`}>
            {APP_NAME}
          </h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-accent/10 rounded-lg md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="space-y-1 p-3 mt-4 overflow-y-auto flex-1">
          {/* Timer Widget in Sidebar */}
          <div className={`mb-6 p-3 bg-accent/5 rounded-lg border border-accent/10 ${!isSidebarOpen && "md:hidden lg:block"}`}>
            <div className="flex items-center gap-2 mb-2 text-accent">
              <Clock size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">Time Tracking</span>
            </div>
            <div className="text-2xl font-bold">{todayHours} <span className="text-sm font-normal text-muted-foreground">hrs</span></div>
            {isClockedIn ? (
              <div className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Clocked In
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mt-1">Clocked Out</div>
            )}
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id as any)
                  if (window.innerWidth < 768) setIsSidebarOpen(false)
                }}
                className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 
                    ${activeView === item.id
                    ? "bg-slate-100 text-slate-900 font-semibold shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                title={item.label}
              >
                <Icon
                  size={20}
                  strokeWidth={activeView === item.id ? 2.5 : 2}
                  className={`shrink-0 transition-colors ${activeView === item.id ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`}
                />
                <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"} transition-opacity duration-200 flex-1 text-left text-sm`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>

        <div className="p-3 space-y-1">
          <button
            onClick={() => setShowProfileSettings(true)}
            className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200"
            title="Settings"
          >
            <Settings size={20} className="shrink-0 text-slate-400 group-hover:text-slate-600 transition-colors" />
            <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"} text-sm font-medium`}>Settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-red-500 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
            title="Sign Out"
          >
            <LogOut size={20} className="shrink-0 transition-colors" />
            <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"} text-sm font-medium`}>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100">
        {/* Header */}
        <header className="bg-white border-b border-border shadow-sm h-16 flex-shrink-0 z-30">
          <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 hover:bg-accent/10 rounded-lg md:hidden text-foreground"
              >
                <Menu size={24} />
              </button>

              <div className="flex flex-col">
                <h1 className="text-lg md:text-xl font-bold text-foreground leading-tight truncate">
                  <span className="md:hidden">{APP_NAME}</span>
                  <span className="hidden md:inline">{APP_NAME} Productivity Tracker</span>
                </h1>
                <p className="text-xs text-muted-foreground hidden md:block">
                  Welcome, {userName} • <span className="text-blue-600 font-medium">{getFormattedDate()}</span> • <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{getFormattedTime()}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell userId={userId} isAdmin={false} />
              <div className="flex-shrink-0">
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
        <main className="flex-1 overflow-auto p-4 md:p-6 w-full relative">
          <div className="md:hidden mb-4">
            <p className="text-sm text-muted-foreground">
              {getTimeBasedGreeting(userName)} • <span className="text-blue-600 font-medium">{getFormattedDate()}</span> • <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{getFormattedTime()}</span>
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
