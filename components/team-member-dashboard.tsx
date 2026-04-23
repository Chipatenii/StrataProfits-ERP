"use client"

import { getNavItemsForRole } from "@/lib/navigation"
import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Clock,
  TrendingUp,
  Activity,
} from "lucide-react"
import { MyDayView } from "@/components/dashboard-views/my-day-view"
import { MeetingsView } from "@/components/dashboard-views/meetings-view"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"
import { CreateSelfTaskModal } from "@/components/modals/create-self-task-modal"
import { TeamTasksView } from "@/components/dashboard-views/team-tasks-view"
import { FilesView } from "@/components/dashboard-views/files-view"
import { HRView } from "@/components/dashboard-views/hr-view"
import { VASOPs } from "@/components/dashboard-views/va-sops"
import { ProjectListView } from "@/components/projects/project-list-view"
import { ProjectDetailView } from "@/components/projects/project-detail-view"
import { DailyCheckInView } from "@/components/dashboard-views/daily-checkin-view"
import { ActivityFeed } from "@/components/dashboard-views/activity-feed"
import { Timer } from "@/components/timer"
import { Task, TimeLog, UserProfile } from "@/lib/types"
import { DashboardShell, DashboardNavItem } from "./dashboard-shell"

export function TeamMemberDashboard({
  userId,
  userName,
}: {
  userId: string
  userName: string
}) {
  const supabase = createClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [todayMinutes, setTodayMinutes] = useState(0)
  const [currentClockInTime, setCurrentClockInTime] = useState<string | null>(null)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
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
      setActiveTaskId(activeLog?.task_id || null)

      // Weekly stats
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)
      const weekStartStr = weekStart.toISOString()

      const { data: weeklyLogsData } = await supabase
        .from("time_logs")
        .select("duration_minutes")
        .eq("user_id", userId)
        .gte("clock_in", weekStartStr)

      const wMins = (weeklyLogsData || []).reduce((acc, l) => acc + (l.duration_minutes || 0), 0)
      setWeeklyMinutes(wMins)

      const completedThisWeek = (tasksData || []).filter(
        t => (t.status === "completed" || t.status === "verified") && t.completed_at && new Date(t.completed_at) >= weekStart
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
  }, [loadData])

  useRealtimeSubscription("tasks", loadData)
  useRealtimeSubscription("time_logs", loadData)

  // Polling safety net — recovers from realtime channel drops so personal
  // stats (hours, tasks completed) don't go stale during the workday.
  useEffect(() => {
    const id = setInterval(() => { loadData() }, 90_000)
    return () => clearInterval(id)
  }, [loadData])

  // --- Dynamic nav based on role permissions ---
  const role = (profile?.role || "team_member") as UserProfile["role"]

  const menuItems: DashboardNavItem[] = useMemo(() => {
    const navItems = getNavItemsForRole(role)
    // Add Activity nav item
    return [
      ...navItems,
      { id: "activity", label: "Activity", icon: Activity },
    ]
  }, [role])

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
    const isDone = (s?: string) => s === "completed" || s === "verified"
    const activeTasks = tasks.filter(t => !isDone(t.status) && t.status !== "pending_approval").length
    const completedTasks = tasks.filter(t => isDone(t.status)).length
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

  // --- Sidebar widgets (Timer + Stats) ---
  const sidebarWidgets = (
    <>
      {/* Live timer widget */}
      <div className={`mb-3 p-4 rounded-lg border ${isClockedIn
        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/40"
        : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
        }`}>
        <div className={`flex items-center gap-2 mb-1.5 ${isClockedIn ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
          <Clock size={14} />
          <span className="text-xs font-medium uppercase tracking-wide">
            {isClockedIn ? "Working" : "Time today"}
          </span>
          {isClockedIn && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-auto" />
          )}
        </div>

        {isClockedIn ? (
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
            <Timer
              isActive={true}
              startTime={currentClockInTime}
              initialSeconds={completedDaySeconds}
            />
          </div>
        ) : (
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {personalStats.todayHours} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">hrs</span>
          </div>
        )}

        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {isClockedIn ? "Clocked in" : "Clocked out"}
        </div>
      </div>

      {/* Personal stats widget */}
      <div className="mb-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-3 text-emerald-700 dark:text-emerald-400">
          <TrendingUp size={14} />
          <span className="text-xs font-medium uppercase tracking-wide">This week</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-2 rounded-md bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
            <p className="text-base font-bold text-slate-900 dark:text-white">{personalStats.weeklyHours}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Hours</p>
          </div>
          <div className="text-center p-2 rounded-md bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
            <p className="text-base font-bold text-slate-900 dark:text-white">{weeklyCompleted}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Completed</p>
          </div>
          <div className="text-center p-2 rounded-md bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
            <p className="text-base font-bold text-slate-900 dark:text-white">{personalStats.activeTasks}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Active</p>
          </div>
          <div className="text-center p-2 rounded-md bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
            <p className="text-base font-bold text-slate-900 dark:text-white">{personalStats.completionRate}%</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-medium">Rate</p>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <DashboardShell
      userId={userId}
      userName={userName}
      userRole={role}
      profile={profile}
      brandLabel="Team Portal"
      brandInitials="TM"
      menuItems={menuItems}
      activeView={activeView}
      onViewChange={(view) => {
        setActiveView(view)
        if (view !== "projects") setSelectedProjectId(null)
      }}
      mobileNavItems={mobileNavItems}
      sidebarWidgets={sidebarWidgets}
      loading={loading}
      isAdmin={false}
    >
      {activeView === "my-day" && <MyDayView userId={userId} userName={userName} />}
      {activeView === "meetings" && <MeetingsView />}
      {activeView === "tasks" && (
        <TeamTasksView userId={userId} userName={userName} onDataChange={loadData} />
      )}
      {activeView === "files" && <FilesView />}
      {activeView === "hr" && <HRView userRole={role} />}
      {activeView === "sops" && <VASOPs />}
      {activeView === "checkins" && <DailyCheckInView userId={userId} userName={userName} />}
      {activeView === "projects" && (
        selectedProjectId ? (
          <ProjectDetailView projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />
        ) : (
          <ProjectListView userId={userId} onSelectProject={setSelectedProjectId} />
        )
      )}
      {activeView === "activity" && (
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">Activity feed</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Recent actions and updates across the platform.</p>
          </div>
          <ActivityFeed limit={30} />
        </div>
      )}

      {/* Create task FAB — hidden on tasks tab (it has its own button) */}
      {activeView !== "tasks" && activeView !== "activity" && activeView !== "projects" && (
        <button
          onClick={() => setShowCreateTask(true)}
          className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40 flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-700 text-white font-semibold text-sm shadow-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors"
          aria-label="Create new task"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          <span className="hidden sm:inline">New task</span>
        </button>
      )}

      {/* Create Self Task Modal */}
      {showCreateTask && (
        <CreateSelfTaskModal
          open={showCreateTask}
          onOpenChange={setShowCreateTask}
          onSuccess={loadData}
        />
      )}
    </DashboardShell>
  )
}
