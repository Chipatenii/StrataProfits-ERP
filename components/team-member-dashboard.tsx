"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Clock, LogOut, Settings } from "lucide-react"
import { Timer } from "./timer"
import { UserProfileCard } from "./user-profile-card"
import { ProfileSettingsModal } from "./profile-settings-modal"

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  due_date: string
}

interface TimeLog {
  id: string
  clock_in: string
  clock_out: string | null
  duration_minutes: number
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

      setLoading(false)
    } catch (error) {
      console.error("Error loading data:", error)
      setLoading(false)
    }
  }

  const handleClockInOut = async () => {
    try {
      if (isClockedIn) {
        // Clock out
        const activeLog = timeLogs.find((log) => !log.clock_out)
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
      } else {
        // Clock in
        await supabase.from("time_logs").insert({
          user_id: userId,
          clock_in: new Date().toISOString(),
        })
      }

      setIsClockedIn(!isClockedIn)
      setCurrentClockInTime(!isClockedIn ? new Date().toISOString() : null)
      loadData()
    } catch (error) {
      console.error("Error clocking in/out:", error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId)
      loadData()
    } catch (error) {
      console.error("Error updating task:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ostento</h1>
            <p className="text-sm text-muted-foreground">Welcome, {userName}</p>
          </div>
          <div className="flex gap-2">
            {/* Profile Settings Button */}
            <button
              onClick={() => setShowProfileSettings(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-foreground hover:bg-muted transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-foreground hover:bg-muted transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
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
            <button
              onClick={handleClockInOut}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-all ${
                isClockedIn ? "bg-red-500 hover:bg-red-600" : "bg-accent hover:bg-accent/90"
              }`}
            >
              <Clock className="w-5 h-5" />
              {isClockedIn ? "Clock Out" : "Clock In"}
            </button>
          </div>

          {isClockedIn && currentClockInTime && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">Session Duration</p>
              <Timer isActive={isClockedIn} startTime={currentClockInTime} />
            </div>
          )}
        </div>

        {/* Tasks Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Assigned Tasks</h2>
          <div className="grid gap-4">
            {tasks.length === 0 ? (
              <div className="glass-card rounded-lg p-8 text-center">
                <p className="text-muted-foreground">No tasks assigned yet</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="glass-card rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{task.title}</h3>
                      {task.description && <p className="text-muted-foreground mb-3">{task.description}</p>}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          task.priority === "high"
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

                  <select
                    value={task.status}
                    onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>

                  {task.due_date && (
                    <p className="text-sm text-muted-foreground mt-3">
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
