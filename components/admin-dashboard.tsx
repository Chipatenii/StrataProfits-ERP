"use client"

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
  Plus,
  Trash2,
  Edit,
  Users,
  ClipboardList,
  BarChart3,
  FileText,
  Folder,
  Briefcase,
  Calendar,
  Sun,
  DollarSign
} from "lucide-react"
import { UserProfileCard } from "./user-profile-card"
import { ProfileSettingsModal } from "./profile-settings-modal"
import { NotificationBell } from "./notification-bell"
import { AdminEditTaskModal } from "./modals/admin-edit-task-modal"
import { AdminCreateTaskModal } from "./modals/admin-create-task-modal"
import { AdminReviewTaskModal } from "./modals/admin-review-task-modal"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"
import { approveTask, rejectTask } from "@/app/actions/tasks"
import { toast } from "sonner"
import Link from "next/link"

import { MyDayView } from "@/components/dashboard-views/my-day-view"
import { OverviewView } from "@/components/dashboard-views/overview-view"
import { ClientsView } from "@/components/dashboard-views/clients-view"
import { PipelineView } from "@/components/dashboard-views/pipeline-view"
import { MeetingsView } from "@/components/dashboard-views/meetings-view"

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
  is_self_created?: boolean
  approval_status?: string
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
  const [activeView, setActiveView] = useState<"my-day" | "overview" | "tasks" | "team" | "clients" | "pipeline" | "meetings">("my-day")
  const [stats, setStats] = useState<Stats | null>(null)
  const [taskFilter, setTaskFilter] = useState<"all" | "active" | "completed">("all")
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)

  // Review Modal State
  const [reviewingTask, setReviewingTask] = useState<Task | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const loadData = useCallback(async () => {
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
  }, [supabase, userId])

  useEffect(() => {
    loadData()
  }, [])

  // Real-time subscriptions
  useRealtimeSubscription("tasks", loadData)
  useRealtimeSubscription("profiles", loadData)
  useRealtimeSubscription("time_logs", loadData)

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

  // Review Actions
  const handleApproveTask = async (task: Task) => {
    setIsProcessing(true)
    try {
      const result = await approveTask(task.id)
      if (result.success) {
        toast.success("Task approved successfully")
        setReviewingTask(null)
        loadData()
      } else {
        toast.error("Failed to approve task")
      }
    } catch (error) {
      console.error("Error approving task:", error)
      toast.error("An error occurred")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRejectTask = async (task: Task) => {
    if (!confirm("Are you sure you want to reject this task? This action cannot be undone.")) return

    setIsProcessing(true)
    try {
      const result = await rejectTask(task.id)
      if (result.success) {
        toast.success("Task rejected")
        setReviewingTask(null)
        loadData()
      } else {
        toast.error("Failed to reject task")
      }
    } catch (error) {
      console.error("Error rejecting task:", error)
      toast.error("An error occurred")
    } finally {
      setIsProcessing(false)
    }
  }

  const getMemberName = (memberId: string | null) => {
    if (!memberId) return "Unassigned"
    const member = members.find((m) => m.id === memberId)
    return member?.full_name || "Unknown"
  }

  const pendingTasks = tasks.filter(t => t.approval_status === "pending")
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
    pending: pendingTasks.length,
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
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 bg-white rounded-lg p-2 border border-border shadow-sm">
          <button
            onClick={() => setActiveView("my-day")}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-md text-sm font-medium transition-colors ${activeView === "my-day" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Sun className="w-4 h-4" />
            <span className="whitespace-nowrap">My Day</span>
          </button>

          <button
            onClick={() => setActiveView("overview")}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-md text-sm font-medium transition-colors ${activeView === "overview" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="whitespace-nowrap">Overview</span>
          </button>

          <button
            onClick={() => setActiveView("clients")}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-md text-sm font-medium transition-colors ${activeView === "clients" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Folder className="w-4 h-4" />
            <span className="whitespace-nowrap">Clients</span>
          </button>

          <button
            onClick={() => setActiveView("pipeline")}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-md text-sm font-medium transition-colors ${activeView === "pipeline" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <DollarSign className="w-4 h-4" />
            <span className="whitespace-nowrap">Pipeline</span>
          </button>

          <button
            onClick={() => setActiveView("meetings")}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-md text-sm font-medium transition-colors ${activeView === "meetings" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Calendar className="w-4 h-4" />
            <span className="whitespace-nowrap">Meetings</span>
          </button>

          <button
            onClick={() => setActiveView("tasks")}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-md text-sm font-medium transition-colors ${activeView === "tasks" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span className="whitespace-nowrap">Tasks ({taskStats.total})</span>
          </button>
          <button
            onClick={() => setActiveView("team")}
            className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-md text-sm font-medium transition-colors ${activeView === "team" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Users className="w-4 h-4" />
            <span className="whitespace-nowrap">Team ({members.length})</span>
          </button>
        </div>

        {/* Views Rendering */}

        {activeView === "my-day" && (
          <MyDayView userId={userId} userName={userName} />
        )}

        {activeView === "clients" && (
          <ClientsView />
        )}

        {activeView === "pipeline" && (
          <PipelineView />
        )}

        {activeView === "meetings" && (
          <MeetingsView />
        )}

        {/* Overview View */}
        {activeView === "overview" && (
          <OverviewView
            stats={stats}
            taskStats={taskStats}
            membersCount={members.length}
            setActiveView={setActiveView as any}
          />
        )}


        {/* Tasks View */}
        {activeView === "tasks" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-bold">All Tasks</h2>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowCreateTask(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors font-medium text-sm sm:text-base"
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
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${taskFilter === "completed"
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

              {/* Task Requests Section - Only shown when filtering 'All' or 'Active' */}
              {(taskFilter === 'all' || taskFilter === 'active') && pendingTasks.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h3 className="text-lg font-semibold text-amber-900 flex items-center gap-2">
                    <span className="w-2 h-8 bg-amber-500 rounded-full"></span>
                    Pending Reviews ({pendingTasks.length})
                  </h3>
                  <div className="grid gap-3">
                    {pendingTasks.map((task) => (
                      <div key={task.id} className="glass-card rounded-lg p-4 border-l-4 border-l-amber-500 bg-amber-50/40">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">{task.title}</h3>
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded uppercase font-bold tracking-wider">
                                Needs Approval
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Requested by: <span className="font-medium text-foreground">{getMemberName(task.assigned_to)}</span></span>
                              <span>{new Date(task.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div>
                            <button
                              onClick={() => setReviewingTask(task)}
                              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium shadow-sm w-full sm:w-auto"
                            >
                              Review Request
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="h-px bg-border/50 my-4" />
                </div>
              )}

              {filteredTasks.filter(t => t.approval_status !== "pending").length === 0 ? (
                <div className="glass-card rounded-lg p-6 sm:p-8 text-center">
                  <p className="text-muted-foreground">No tasks found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map((task) => (
                    <div key={task.id} className="glass-card rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{task.title}</h3>
                          {task.approval_status === "pending" && (
                            <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded uppercase font-bold tracking-wider">
                              Request
                            </span>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${task.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : task.status === "in_progress"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                                }`}
                            >
                              {task.status}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              {getMemberName(task.assigned_to)}
                            </span>
                            {task.due_date && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                Due: {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                            {task.estimated_hours && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                                Est: {task.estimated_hours}h
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
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
                  ))}
                </div>
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
            userId={userId}
            onOpenChange={setShowCreateTask}
            onSuccess={loadData}
          />
        )}

        {/* Review Task Modal */}
        {reviewingTask && (
          <AdminReviewTaskModal
            open={!!reviewingTask}
            task={reviewingTask}
            onOpenChange={(open) => !open && setReviewingTask(null)}
            onApprove={handleApproveTask}
            onReject={handleRejectTask}
            isProcessing={isProcessing}
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
                              <span className="font-medium">Tasks Assigned:</span> {memberTasks.length}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Tasks Completed:</span> {memberTasks.filter(t => t.status === "completed").length}
                            </p>
                          </div>
                        </div>
                        {member.role !== "admin" && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingMember(member)}
                              className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                              title="Edit member"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMember(member.id)}
                              className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                              title="Delete member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* Edit Member Modal */}
        {editingMember && (
          <ProfileSettingsModal
            userId={editingMember.id}
            isAdmin={true}
            onClose={() => setEditingMember(null)}
            onSuccess={() => {
              setEditingMember(null)
              loadData()
            }}
          />
        )}
      </main>
    </div>
  )
}
