"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
  LogOut,
  Settings,
  CheckCircle,
  Menu,
  X,
  Loader2,
  Plus,
  Trash2,
  Edit,
  Users,
  ClipboardList,
  BarChart3,
  FileText
} from "lucide-react"
import { UserProfileCard } from "./user-profile-card"
import { ProfileSettingsModal } from "./profile-settings-modal"
import { NotificationBell } from "./notification-bell"
import { AdminEditTaskModal } from "./modals/admin-edit-task-modal"
import { AdminCreateTaskModal } from "./modals/admin-create-task-modal"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"
import Link from "next/link"

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  due_date: string
  estimated_hours: number | null
  assigned_to: string | null
  created_at: string
  completed_at?: string
}

interface Member {
  id: string
  full_name: string
  email: string
  role: string
  hourly_rate: number | null
}

interface Profile {
  full_name: string
  email: string
  role: string
  avatar_url: string | null
}

interface Stats {
  leaderboard: {
    id: string
    name: string
    completedTasks: number
    totalEarnings: number
  }[]
  bestPerformer: {
    id: string
    name: string
    completedTasks: number
    totalEarnings: number
  } | null
}

export function AdminDashboard({
  userId,
  userName,
}: {
  userId: string
  userName: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeView, setActiveView] = useState<"overview" | "tasks" | "team">("overview")
  const [stats, setStats] = useState<Stats | null>(null)
  const [taskFilter, setTaskFilter] = useState<"all" | "active" | "completed">("all")
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showCreateTask, setShowCreateTask] = useState(false)

  const loadData = async () => {
    try {
      // Load profile
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).single()
      setProfile(profileData)

      // Load tasks (admin can see all tasks)
      const tasksResponse = await fetch("/api/admin/tasks")
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json()
        setTasks(tasksData || [])
      }

      // Load team members
      const membersResponse = await fetch("/api/admin/members")
      if (membersResponse.ok) {
        const membersData = await membersResponse.json()
        setMembers(membersData || [])
      }

      // Load stats
      const statsResponse = await fetch("/api/team/stats")
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      setLoading(false)
    } catch (error) {
      console.error("Error loading data:", error)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Real-time subscriptions
  useRealtimeSubscription("tasks", loadData)
  useRealtimeSubscription("profiles", loadData)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return

    try {
      const response = await fetch(`/api/admin/tasks?id=${taskId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        loadData()
      }
    } catch (error) {
      console.error("Error deleting task:", error)
    }
  }

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to delete this team member? This action cannot be undone.")) return

    try {
      const response = await fetch(`/api/admin/members/${memberId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        loadData()
      }
    } catch (error) {
      console.error("Error deleting member:", error)
    }
  }

  const getMemberName = (memberId: string | null) => {
    if (!memberId) return "Unassigned"
    const member = members.find((m) => m.id === memberId)
    return member?.full_name || "Unknown"
  }

  const filteredTasks = tasks.filter((task) => {
    if (taskFilter === "all") return true
    if (taskFilter === "active") return task.status !== "completed"
    if (taskFilter === "completed") return task.status === "completed"
    return true
  })

  const taskStats = {
    total: tasks.length,
    active: tasks.filter((t) => t.status !== "completed").length,
    completed: tasks.filter((t) => t.status === "completed").length,
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
            <p className="text-xs md:text-sm text-muted-foreground">Admin Dashboard - Welcome, {userName}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Notification Bell - Always visible */}
            <NotificationBell userId={userId} isAdmin={true} />

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
          isAdmin={true}
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

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 bg-white rounded-lg p-1 border border-border shadow-sm">
          <button
            onClick={() => setActiveView("overview")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeView === "overview" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <BarChart3 className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveView("tasks")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeView === "tasks" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <ClipboardList className="w-4 h-4" />
            Tasks ({taskStats.total})
          </button>
          <button
            onClick={() => setActiveView("team")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeView === "team" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Users className="w-4 h-4" />
            Team ({members.length})
          </button>
        </div>

        {/* Overview View */}
        {activeView === "overview" && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Total Tasks</h3>
                  <ClipboardList className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold">{taskStats.total}</p>
              </div>
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Active Tasks</h3>
                  <ClipboardList className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-3xl font-bold">{taskStats.active}</p>
              </div>
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Completed</h3>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold">{taskStats.completed}</p>
              </div>
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Team Members</h3>
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-3xl font-bold">{members.length}</p>
              </div>
            </div>

            {/* Analytics Section */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <p className="text-sm text-muted-foreground">{stats.bestPerformer.completedTasks} tasks completed</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No data available</p>
                  )}
                </div>

                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Team Earnings Leaderboard</h3>
                  <div className="space-y-3">
                    {stats.leaderboard.slice(0, 5).map((member, index) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground w-4">{index + 1}</span>
                          <span className="font-medium">{member.name}</span>
                        </div>
                        <span className="text-green-600 font-semibold">ZMW {member.totalEarnings.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href="/reports"
                  className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200"
                >
                  <FileText className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">Monthly Reports</p>
                    <p className="text-sm text-blue-700">View detailed team reports</p>
                  </div>
                </Link>
                <button
                  onClick={() => setActiveView("tasks")}
                  className="flex items-center gap-3 p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors border border-purple-200"
                >
                  <ClipboardList className="w-6 h-6 text-purple-600" />
                  <div>
                    <p className="font-medium text-purple-900">Manage Tasks</p>
                    <p className="text-sm text-purple-700">Create and assign tasks</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tasks View */}
        {activeView === "tasks" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">All Tasks</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateTask(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Create Task
                </button>
                <div className="flex bg-white rounded-lg p-1 border border-border">
                  <button
                    onClick={() => setTaskFilter("all")}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${taskFilter === "all" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setTaskFilter("active")}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${taskFilter === "active" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setTaskFilter("completed")}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${taskFilter === "completed" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
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
                  <p className="text-muted-foreground">No tasks found</p>
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <div key={task.id} className="glass-card rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{task.title}</h3>
                          {task.status === "completed" && <CheckCircle className="w-5 h-5 text-green-500" />}
                        </div>
                        {task.description && <p className="text-muted-foreground mb-3">{task.description}</p>}
                        <div className="flex flex-wrap gap-2 text-sm">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            Assigned to: {getMemberName(task.assigned_to)}
                          </span>
                          {task.due_date && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                          {task.estimated_hours && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                              Est: {task.estimated_hours}h
                            </span>
                          )}
                        </div>
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
                        <button
                          onClick={() => setEditingTask(task)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Edit task"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                          title="Delete task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Edit Task Modal */}
        {editingTask && (
          <AdminEditTaskModal
            open={!!editingTask}
            task={editingTask}
            members={members}
            onOpenChange={(open) => !open && setEditingTask(null)}
            onSuccess={loadData}
          />
        )}

        {/* Create Task Modal */}
        {showCreateTask && (
          <AdminCreateTaskModal
            open={showCreateTask}
            members={members}
            onOpenChange={setShowCreateTask}
            onSuccess={loadData}
          />
        )}

        {/* Team View */}
        {activeView === "team" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Team Members</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.length === 0 ? (
                <div className="glass-card rounded-lg p-8 text-center col-span-full">
                  <p className="text-muted-foreground">No team members found</p>
                </div>
              ) : (
                members.map((member) => {
                  const memberTasks = tasks.filter((t) => t.assigned_to === member.id)
                  return (
                    <div key={member.id} className="glass-card rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{member.full_name}</h3>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm">
                              <span className="font-medium">Role:</span>{" "}
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                {member.role}
                              </span>
                            </p>
                            {member.hourly_rate && (
                              <p className="text-sm">
                                <span className="font-medium">Rate:</span> ZMW {member.hourly_rate}/hr
                              </p>
                            )}
                            <p className="text-sm">
                              <span className="font-medium">Tasks:</span> {memberTasks.length} assigned
                            </p>
                          </div>
                        </div>
                        {member.role !== "admin" && (
                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                            title="Delete member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
