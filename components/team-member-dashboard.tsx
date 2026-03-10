"use client"

import { APP_NAME } from "@/lib/config"
import { getNavItemsForRole } from "@/lib/navigation"
import { useEffect, useState, useCallback, useMemo } from "react"
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
  Calendar,
  TrendingUp,
  Target,
  Zap,
  Activity,
  FolderKanban,
  Cloud,
  Briefcase,
  Book,
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
import { FilesView } from "@/components/dashboard-views/files-view"
import { HRView } from "@/components/dashboard-views/hr-view"
import { VASOPs } from "@/components/dashboard-views/va-sops"
import { ProjectListView } from "@/components/projects/project-list-view"
import { ProjectDetailView } from "@/components/projects/project-detail-view"
import { ActivityFeed } from "@/components/dashboard-views/activity-feed"
import { Timer } from "@/components/timer"
import { Task, TimeLog, UserProfile } from "@/lib/types"
import { hasPermission } from "@/lib/permissions"

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
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [todayMinutes, setTodayMinutes] = useState(0)
  const [currentClockInTime, setCurrentClockInTime] = useState<string | null>(null)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [activeView, setActiveView] = useState<string>("my-day")
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  // --- Weekly stats ---
  const [weeklyMinutes, setWeeklyMinutes] = useState(0)
  const [weeklyCompleted, setWeeklyCompleted] = useState(0)

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

      // Today's time logs
      const today = new Date().toISOString().split("T")[0]
      const { data: logsData } = await supabase
        .from("time_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("clock_in", today)

      setTimeLogs(logsData || [])

      const minutes = (logsData || []).reduce((acc, log) => {
        return acc + (log.duration_minutes || 0)
      }, 0)
      setTodayMinutes(minutes)

      const activeLog = (logsData || []).find((log) => !log.clock_out)
      setIsClockedIn(!!activeLog)
      setCurrentClockInTime(activeLog?.clock_in || null)
      if (activeLog?.task_id) {
        setActiveTaskId(activeLog.task_id)
      } else {
        setActiveTaskId(null)
      }

      // Weekly stats
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Sunday
      weekStart.setHours(0, 0, 0, 0)
      const weekStartStr = weekStart.toISOString()

      const { data: weeklyLogsData } = await supabase
        .from("time_logs")
        .select("duration_minutes")
        .eq("user_id", userId)
        .gte("clock_in", weekStartStr)

      const wMins = (weeklyLogsData || []).reduce((acc, l) => acc + (l.duration_minutes || 0), 0)
      setWeeklyMinutes(wMins)

      // Count tasks completed this week
      const completedThisWeek = (tasksData || []).filter(
        t => t.status === "completed" && t.completed_at && new Date(t.completed_at) >= weekStart
      ).length
      setWeeklyCompleted(completedThisWeek)

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

  // --- Dynamic nav based on role permissions ---
  const role = (profile?.role || "team_member") as UserProfile["role"]
  const menuItems = useMemo(() => getNavItemsForRole(role), [role])

  // Build mobile nav: show up to 4 most relevant items
  const mobileNavItems = useMemo(() => {
    const priorityOrder = ["my-day", "tasks", "meetings", "projects", "files", "sops", "hr"]
    const available = menuItems.map(m => m.id)
    const sorted = priorityOrder.filter(id => available.includes(id))
    return sorted.slice(0, 4).map(id => {
      const item = menuItems.find(m => m.id === id)!
      return { id: item.id, label: item.label, icon: item.icon }
    })
  }, [menuItems])

  // --- Personal stats ---
  const personalStats = useMemo(() => {
    const totalTasks = tasks.length
    const activeTasks = tasks.filter(t => t.status !== "completed").length
    const completedTasks = tasks.filter(t => t.status === "completed").length
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    const todayHours = Math.round((todayMinutes / 60) * 10) / 10
    const weeklyHours = Math.round((weeklyMinutes / 60) * 10) / 10

    return { totalTasks, activeTasks, completedTasks, completionRate, todayHours, weeklyHours }
  }, [tasks, todayMinutes, weeklyMinutes])

  // Previous completed logs for timer initial seconds
  const completedDaySeconds = useMemo(() => {
    return timeLogs
      .filter(l => l.clock_out)
      .reduce((acc, l) => acc + (l.duration_minutes || 0) * 60, 0)
  }, [timeLogs])

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

  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ═══ Sidebar ═══ */}
      <div className={`
        fixed md:relative z-50 h-full
        transition-all duration-300 ease-out
        bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl md:shadow-xl flex flex-col
        ${isSidebarOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0 md:w-20 lg:w-72"}
      `}>
        {/* Branded Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-primary" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_50%)]" />
          <div className="relative p-4 flex items-center justify-between h-20">
            <div className={`flex items-center gap-3 ${!isSidebarOpen && "md:hidden lg:flex"}`}>
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg border border-white/30 shadow-lg">
                TM
              </div>
              <div className="text-white">
                <h2 className="font-bold text-lg leading-tight">Team Portal</h2>
                <p className="text-xs text-indigo-100/80">StrataForge Business Suite</p>
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
          {/* ═══ Live Timer Widget ═══ */}
          <div className={`mb-4 p-4 rounded-2xl border transition-all ${isClockedIn
            ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
            : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
            } ${!isSidebarOpen && "md:hidden lg:block"}`}>
            <div className={`flex items-center gap-2 mb-2 ${isClockedIn ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
              <Clock size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {isClockedIn ? "Working" : "Time Today"}
              </span>
              {isClockedIn && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-auto" />
              )}
            </div>

            {isClockedIn ? (
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                <Timer
                  isActive={true}
                  startTime={currentClockInTime}
                  initialSeconds={completedDaySeconds}
                />
              </div>
            ) : (
              <div className="text-2xl font-bold text-foreground">
                {personalStats.todayHours} <span className="text-sm font-normal text-muted-foreground">hrs</span>
              </div>
            )}

            <div className="text-xs text-muted-foreground mt-1">
              {isClockedIn ? "Clocked In" : "Clocked Out"}
            </div>
          </div>

          {/* ═══ Personal Stats Widget ═══ */}
          <div className={`mb-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 ${!isSidebarOpen && "md:hidden lg:block"}`}>
            <div className="flex items-center gap-2 mb-3 text-primary">
              <TrendingUp size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">This Week</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 rounded-xl bg-white dark:bg-slate-900/50">
                <p className="text-lg font-bold text-foreground">{personalStats.weeklyHours}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Hours</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-white dark:bg-slate-900/50">
                <p className="text-lg font-bold text-foreground">{weeklyCompleted}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Completed</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-white dark:bg-slate-900/50">
                <p className="text-lg font-bold text-foreground">{personalStats.activeTasks}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Active</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-white dark:bg-slate-900/50">
                <p className="text-lg font-bold text-foreground">{personalStats.completionRate}%</p>
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Rate</p>
              </div>
            </div>
          </div>

          {/* ═══ Nav Items (dynamic from permissions) ═══ */}
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id)
                  if (item.id !== "projects") setSelectedProjectId(null)
                  if (window.innerWidth < 768) setIsSidebarOpen(false)
                }}
                className={`sidebar-icon-btn group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 min-h-[48px]
                  ${isActive
                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300 font-semibold shadow-sm"
                    : "text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-foreground"
                  }`}
                title={item.label}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 2}
                  data-tooltip={item.label}
                  className={`shrink-0 transition-colors ${isActive ? "text-indigo-600 dark:text-indigo-300" : "text-muted-foreground group-hover:text-foreground"}`}
                />
                <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"} transition-opacity duration-200 flex-1 text-left text-sm`}>
                  {item.label}
                </span>
              </button>
            )
          })}

          {/* Activity Feed nav item (always available) */}
          <button
            onClick={() => {
              setActiveView("activity")
              if (window.innerWidth < 768) setIsSidebarOpen(false)
            }}
            className={`sidebar-icon-btn group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 min-h-[48px]
              ${activeView === "activity"
                ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300 font-semibold shadow-sm"
                : "text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-foreground"
              }`}
            title="Activity"
          >
            <Activity
              size={20}
              strokeWidth={activeView === "activity" ? 2.5 : 2}
              className={`shrink-0 transition-colors ${activeView === "activity" ? "text-indigo-600 dark:text-indigo-300" : "text-muted-foreground group-hover:text-foreground"}`}
            />
            <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"} transition-opacity duration-200 flex-1 text-left text-sm`}>
              Activity
            </span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
          <button
            onClick={() => setShowProfileSettings(true)}
            className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-foreground transition-all duration-200 min-h-[48px]"
            title="Settings"
          >
            <Settings size={20} className="shrink-0 transition-colors" />
            <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"} text-sm font-medium`}>Settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition-all duration-200 min-h-[48px]"
            title="Sign Out"
          >
            <LogOut size={20} className="shrink-0 transition-colors" />
            <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"} text-sm font-medium`}>Sign Out</span>
          </button>
        </div>
      </div>

      {/* ═══ Main Content ═══ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* Header */}
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
                  Welcome back, <span className="font-medium text-foreground">{userName}</span> • <span className="text-indigo-600 dark:text-indigo-400 font-medium">{getFormattedDate()}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              {/* Compact timer badge in header for mobile */}
              {isClockedIn && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-800 md:hidden">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
                    <Timer
                      isActive={true}
                      startTime={currentClockInTime}
                      initialSeconds={completedDaySeconds}
                    />
                  </span>
                </div>
              )}
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
          ) : activeView === "files" ? (
            <FilesView />
          ) : activeView === "hr" ? (
            <HRView />
          ) : activeView === "sops" ? (
            <VASOPs />
          ) : activeView === "projects" ? (
            selectedProjectId ? (
              <ProjectDetailView projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />
            ) : (
              <ProjectListView userId={userId} onSelectProject={setSelectedProjectId} />
            )
          ) : activeView === "activity" ? (
            <div className="space-y-6 animate-fade-in">
              {/* Activity Hero */}
              <div className="relative overflow-hidden rounded-3xl bg-primary p-8 md:p-10 text-white shadow-2xl shadow-primary/30">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-5 h-5 text-indigo-200" />
                    <span className="text-sm font-medium text-indigo-100 uppercase tracking-wider">Feed</span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">Activity Feed</h1>
                  <p className="text-indigo-100/80 text-lg">Recent actions and updates across the platform</p>
                </div>
              </div>
              <ActivityFeed limit={30} />
            </div>
          ) : null}

          {/* Create Task FAB — hidden on tasks tab (it has its own button) */}
          {activeView !== "tasks" && activeView !== "activity" && activeView !== "projects" && (
            <button
              onClick={() => setShowCreateTask(true)}
              className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40 flex items-center gap-2 px-4 py-3 md:px-5 md:py-3 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:brightness-110 active:scale-[0.97] transition-all duration-200"
              aria-label="Create new task"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              <span className="hidden sm:inline">New Task</span>
            </button>
          )}
        </main>

        {/* ═══ Dynamic Mobile Bottom Nav ═══ */}
        <MobileBottomNav
          activeView={activeView}
          onViewChange={(view) => setActiveView(view)}
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
