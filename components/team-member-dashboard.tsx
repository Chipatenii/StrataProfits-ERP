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

  // --- Sidebar Widgets (Timer + Stats) ---
  const sidebarWidgets = (
    <>
      {/* ═══ Live Timer Widget ═══ */}
      <div className={`mb-4 p-4 rounded-2xl border transition-all ${isClockedIn
        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
        : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
        }`}>
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
      <div className="mb-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
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
      {activeView === "hr" && <HRView />}
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
      )}

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
