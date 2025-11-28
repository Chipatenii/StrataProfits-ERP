"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { LogOut, Settings, Clock, CheckCircle, Menu, X, Loader2 } from "lucide-react"
import { Timer } from "./timer"
import { UserProfileCard } from "./user-profile-card"
import { ProfileSettingsModal } from "./profile-settings-modal"
import { TimeAllocationIndicator } from "@/components/time-allocation-indicator"
import { TaskCompletionModal } from "@/components/modals/task-completion-modal"
import { NotificationBell } from "@/components/notification-bell"
import { calculateTimeSpent } from "@/lib/time-utils"

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
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [todayHours, setTodayHours] = useState(0)
  const [currentClockInTime, setCurrentClockInTime] = useState<string | null>(null)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [completingTask, setCompletingTask] = useState<Task | null>(null)
  const [animatingTaskId, setAnimatingTaskId] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active")

  const filteredTasks = tasks.filter((task) => {
    if (activeTab === "active") {
      return task.status !== "completed"
    }
    return task.status === "completed"
  })

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).single()
      setProfile(profileData)

      // Get assigned tasks
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", userId)
        .order("created_at", { ascending: false })

      setTasks(tasksData || [])

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
    } catch (error) {
      console.error("Error loading data:", error)
      setLoading(false)
    }
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-border shadow-sm relative">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Ostento Tracker</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Welcome, {userName}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Notification Bell - Always visible */}
            <NotificationBell userId={userId} isAdmin={false} />

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setShowProfileSettings(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-border shadow-lg z-50 p-4 space-y-3 animate-in slide-in-from-top-2">
            <button
              onClick={() => {
                setShowProfileSettings(true)
                setIsMobileMenuOpen(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        )}
      </header>

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

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {profile && (
          <UserProfileCard
            fullName={profile.full_name}
            email={profile.email}
            role={profile.role}
            avatarUrl={profile.avatar_url || undefined}
          />
        )}

        {/* Clock In/Out Card with Real-time Timer */}
        <div className="glass-card rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Time Tracking</h2>
              <p className="text-muted-foreground">Today&apos;s hours: {todayHours} hours</p>
            </div>
          </div>
        </div>

        {/* Tasks Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">My Tasks</h2>
            <div className="flex bg-white rounded-lg p-1 border border-border">
              <button
                onClick={() => setActiveTab("active")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "active" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Active
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "completed" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Completed
              </button>
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
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{task.title}</h3>
                          {task.status === "completed" && <CheckCircle className="w-5 h-5 text-green-500" />}
                        </div>
                        {task.description && <p className="text-muted-foreground mb-3">{task.description}</p>}
                      </div>
                      <div className="flex gap-2 ml-4">
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
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Time on this task:</p>
                              {isTaskActive && (
                                <Timer
                                  isActive={true}
                                  startTime={timeLogs.find((log) => !log.clock_out)?.clock_in || ""}
                                />
                              )}
                              {!isTaskActive && (
                                <p className="text-lg font-semibold">
                                  {(calculateTimeSpent(timeLogs, task.id) / 60).toFixed(1)} hrs
                                </p>
                              )}
                            </div>
                            {task.estimated_hours && (
                              <div className="block">
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
                            className={`px-4 py-2 rounded-lg font-medium text-white transition-all ${isTaskActive ? "bg-red-500 hover:bg-red-600" : "bg-accent hover:bg-accent/90"
                              }`}
                          >
                            {isTaskActive ? "Stop" : "Start"}
                          </button>
                        </div>
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
                        {task.completion_notes && (
                          <p className="mt-1 italic">"{task.completion_notes}"</p>
                        )}
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
      </main>
    </div>
  )
}
