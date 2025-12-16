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
import { TimeAllocationIndicator } from "@/components/time-allocation-indicator"
import { TaskCompletionModal } from "@/components/modals/task-completion-modal"
import { NotificationBell } from "@/components/notification-bell"
import { calculateTimeSpent, getTimeBasedGreeting } from "@/lib/time-utils"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"
import { CreateSelfTaskModal } from "@/components/modals/create-self-task-modal"

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
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [activeView, setActiveView] = useState<"my-day" | "tasks" | "pipeline">("my-day")

  const filteredTasks = tasks.filter((task) => {
    // Filter by project
    if (projectFilter !== "all" && task.project_id !== projectFilter) {
      return false
    }

    // Filter by status (tab)
    if (activeTab === "active") {
      return task.status !== "completed"
    }
    return task.status === "completed"
  })

  const loadData = useCallback(async () => {
    try {
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).single()
      setProfile(profileData)

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

  // Timer event handlers
  const handleTimerWarning = useCallback((taskId: string, taskTitle: string, remainingMinutes: number) => {
    setTimerNotification({
      type: "warning",
      taskTitle,
      remainingMinutes,
    })
  }, [])

  const handleTimeElapsed = useCallback(
    async (taskId: string, taskTitle: string) => {
      // Show notification to user
      setTimerNotification({
        type: "elapsed",
        taskTitle,
      })

      // Auto-pause the timer
      const activeLog = timeLogs.find((log) => !log.clock_out && log.task_id === taskId)
      if (activeLog) {
        const clockOut = new Date().toISOString()
        const clockIn = new Date(activeLog.clock_in)
        const durationMinutes = Math.round((new Date(clockOut).getTime() - clockIn.getTime()) / 60000)

        await supabase
          .from("time_logs")
          .update({
            clock_out: clockOut,
            duration_minutes: durationMinutes,
          })
          .eq("id", activeLog.id)

        setActiveTaskId(null)
      }

      // Mark task as needing attention and notify admin
      await supabase
        .from("tasks")
        .update({
          status: "in_progress", // Keep as in-progress but will be flagged
        })
        .eq("id", taskId)

      // Create notification for admin
      const { data: adminProfiles } = await supabase.from("profiles").select("id").eq("role", "admin")

      if (adminProfiles && adminProfiles.length > 0) {
        for (const admin of adminProfiles) {
          await supabase.from("notifications").insert({
            user_id: admin.id,
            type: "task_time_exceeded",
            title: "Task Time Exceeded",
            message: `Task "${taskTitle}" has exceeded its allocated time and needs review.`,
            task_id: taskId,
          })
        }
      }

      loadData()
    },
    [timeLogs, supabase, loadData],
  )

  const handleTaskStartStop = async (taskId: string) => {
    try {
      const activeLog = timeLogs.find((log) => !log.clock_out)

      if (activeLog?.task_id === taskId) {
        // Stop tracking this task
        const clockOut = new Date().toISOString()
        const clockIn = new Date(activeLog.clock_in)
        const durationMinutes = Math.round((new Date(clockOut).getTime() - clockIn.getTime()) / 60000)

        await supabase
          .from("time_logs")
          .update({
            clock_out: clockOut,
            duration_minutes: durationMinutes,
          })
          .eq("id", activeLog.id)

        setActiveTaskId(null)
      } else {
        // If another task is active, stop it first
        if (activeLog) {
          const clockOut = new Date().toISOString()
          const clockIn = new Date(activeLog.clock_in)
          const durationMinutes = Math.round((new Date(clockOut).getTime() - clockIn.getTime()) / 60000)

          await supabase
            .from("time_logs")
            .update({
              clock_out: clockOut,
              duration_minutes: durationMinutes,
            })
            .eq("id", activeLog.id)
        }

        // Start new task
        await supabase.from("time_logs").insert({
          user_id: userId,
          task_id: taskId,
          clock_in: new Date().toISOString(),
        })

        setActiveTaskId(taskId)
      }

      loadData()
    } catch (error) {
      console.error("Error toggling task timer:", error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    if (newStatus === "completed") {
      const task = tasks.find((t) => t.id === taskId)
      if (task) {
        setCompletingTask(task)
      }
      return
    }

    try {
      await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId)
      loadData()
    } catch (error) {
      console.error("Error updating task:", error)
    }
  }

  const handleTaskComplete = async (notes: string) => {
    if (!completingTask) return

    try {
      // Stop timer if running for this task
      if (activeTaskId === completingTask.id) {
        await handleTaskStartStop(completingTask.id)
      }

      const { error } = await supabase
        .from("tasks")
        .update({
          status: "completed",
          completion_notes: notes,
          completed_at: new Date().toISOString(),
        })
        .eq("id", completingTask.id)

      if (error) throw error

      const completedTaskId = completingTask.id
      setCompletingTask(null)
      setAnimatingTaskId(completedTaskId)

      setTimeout(() => {
        setAnimatingTaskId(null)
        loadData()
      }, 500)
    } catch (error) {
      console.error("Error completing task:", error)
    }
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
                <p className="text-xs text-muted-foreground hidden md:block">Welcome, {userName}</p>
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
            <p className="text-sm text-muted-foreground">{getTimeBasedGreeting(userName)}</p>
          </div>


          {activeView === "my-day" ? (
            <MyDayView userId={userId} userName={userName} />
          ) : activeView === "pipeline" ? (
            <PipelineView />
          ) : (
            <>
              {/* Clock In/Out Card with Real-time Timer */}
              <div className="glass-card rounded-2xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-2">Time Tracking</h2>
                    <p className="text-muted-foreground">Today&apos;s hours: {todayHours} hours</p>
                  </div>
                  {isClockedIn ? (
                    <button
                      onClick={() => handleTaskStartStop(activeTaskId || "")}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                    >
                      <Pause className="w-4 h-4" />
                      Pause
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Analytics Section */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div className="glass-card rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Best Performer</h3>
                      <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                    </div>
                    {stats.bestPerformer ? (
                      <div>
                        <p className="text-2xl font-bold">{stats.bestPerformer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {stats.bestPerformer.completedTasks} tasks completed
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No data available</p>
                    )}
                  </div>

                  <div className="glass-card rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4">My Performance</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Tasks Completed</span>
                        <span className="font-bold">{filteredTasks.filter(t => t.status === 'completed').length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Hours Logged (Today)</span>
                        <span className="font-bold">{todayHours}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tasks Section */}
              <div className="mt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">My Tasks</h2>
                    <button
                      onClick={() => setShowCreateTask(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      New Task
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <select
                      value={projectFilter}
                      onChange={(e) => setProjectFilter(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                    >
                      <option value="all">All Projects</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex bg-white rounded-lg p-1 border border-border w-full sm:w-auto">
                      <button
                        onClick={() => setActiveTab("active")}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "active" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        Active
                      </button>
                      <button
                        onClick={() => setActiveTab("completed")}
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "completed"
                          ? "bg-accent text-white"
                          : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        Completed
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  {filteredTasks.length === 0 ? (
                    <div className="glass-card rounded-lg p-8 text-center">
                      <p className="text-muted-foreground">No {activeTab} tasks found</p>
                    </div>
                  ) : (
                    filteredTasks.map((task) => {
                      const isTaskActive = activeTaskId === task.id
                      return (
                        <div
                          key={task.id}
                          className={`glass-card rounded-lg p-6 transition-all duration-500 ${animatingTaskId === task.id ? "opacity-0 translate-x-10" : "opacity-100"
                            }`}
                        >
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold truncate">{task.title}</h3>
                                {task.status === "completed" && <CheckCircle className="w-5 h-5 text-green-500" />}
                                {task.approval_status === "pending" && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium border border-amber-200">
                                    <Clock className="w-3 h-3" />
                                    Pending Approval
                                  </span>
                                )}
                                {task.approval_status === "rejected" && (
                                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium border border-red-200">
                                    Rejected
                                  </span>
                                )}
                              </div>
                              {task.description && <p className="text-muted-foreground mb-3 line-clamp-2 md:line-clamp-none">{task.description}</p>}
                              {task.project_id && (
                                <div className="mb-2">
                                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md font-medium">
                                    {projects.find((p) => p.id === task.project_id)?.name || "Unknown Project"}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${task.priority === "high"
                                  ? "bg-red-100 text-red-700"
                                  : task.priority === "medium"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-green-100 text-green-700"
                                  }`}
                              >
                                {task.priority}
                              </span>
                            </div>
                          </div>

                          {activeTab === "active" && (
                            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">Time on this task:</p>
                                    {isTaskActive && (
                                      <Timer
                                        isActive={true}
                                        startTime={timeLogs.find((log) => !log.clock_out)?.clock_in || ""}
                                        estimatedHours={task.estimated_hours || undefined}
                                        onWarning={(remainingMinutes) =>
                                          handleTimerWarning(task.id, task.title, remainingMinutes)
                                        }
                                        onTimeElapsed={() => handleTimeElapsed(task.id, task.title)}
                                      />
                                    )}
                                    {!isTaskActive && (
                                      <p className="text-lg font-semibold">
                                        {(calculateTimeSpent(timeLogs, task.id) / 60).toFixed(1)} hrs
                                      </p>
                                    )}
                                  </div>
                                  {task.estimated_hours && (
                                    <div className="block w-full sm:w-auto">
                                      <TimeAllocationIndicator
                                        spentMinutes={calculateTimeSpent(timeLogs, task.id)}
                                        estimatedHours={task.estimated_hours}
                                        size="sm"
                                      />
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleTaskStartStop(task.id)}
                                  className={`w-full sm:w-auto px-4 py-2 rounded-lg font-medium text-white transition-all flex items-center justify-center gap-2 ${isTaskActive
                                    ? "bg-amber-500 hover:bg-amber-600"
                                    : calculateTimeSpent(timeLogs, task.id) > 0
                                      ? "bg-blue-600 hover:bg-blue-700"
                                      : "bg-green-600 hover:bg-green-700"
                                    }`}
                                >
                                  {isTaskActive ? (
                                    <>
                                      <Pause className="w-4 h-4" />
                                      Pause
                                    </>
                                  ) : calculateTimeSpent(timeLogs, task.id) > 0 ? (
                                    <>
                                      <Play className="w-4 h-4" />
                                      Resume
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-4 h-4" />
                                      Start
                                    </>
                                  )}
                                </button>
                              </div>
                              {task.due_date && (
                                <div className="mt-3 pt-3 border-t border-blue-200">
                                  <p className="text-sm text-blue-700 font-medium">
                                    📅 Deadline:{" "}
                                    {new Date(task.due_date).toLocaleDateString(undefined, {
                                      weekday: "short",
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {activeTab === "active" ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleTaskStatusChange(task.id, "completed")}
                                className="flex-1 btn-secondary flex items-center justify-center gap-2 hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Mark as Completed
                              </button>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              Completed on {new Date(task.completed_at || "").toLocaleDateString()}
                              {task.completion_notes && <p className="mt-1 italic">"{task.completion_notes}"</p>}
                            </div>
                          )}

                          {task.due_date && activeTab === "active" && (
                            <p className="text-sm text-muted-foreground mt-3">
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </main>

        {/* Timer Notification */}
        {timerNotification && (
          <TimerNotification
            type={timerNotification.type}
            taskTitle={timerNotification.taskTitle}
            remainingMinutes={timerNotification.remainingMinutes}
            onClose={() => setTimerNotification(null)}
          />
        )}

        {/* Profile Settings Modal */}
        {showProfileSettings && (
          <ProfileSettingsModal
            userId={userId}
            isAdmin={false}
            onClose={() => setShowProfileSettings(false)}
            onSuccess={() => {
              setShowProfileSettings(false)
              loadData()
            }}
          />
        )}

        {/* Task Completion Modal */}
        {completingTask && (
          <TaskCompletionModal
            isOpen={!!completingTask}
            onClose={() => setCompletingTask(null)}
            onComplete={handleTaskComplete}
            taskTitle={completingTask.title}
            spentMinutes={calculateTimeSpent(timeLogs, completingTask.id)}
            estimatedHours={completingTask.estimated_hours || undefined}
          />
        )}

        {/* Create Self Task Modal */}
        {showCreateTask && (
          <CreateSelfTaskModal open={showCreateTask} onOpenChange={setShowCreateTask} onSuccess={loadData} />
        )}
      </div>
    </div>
  )
}
