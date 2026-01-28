"use client"
import { APP_NAME } from "@/lib/config"
import { getNavItemsForRole } from "@/lib/navigation"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, useCallback } from "react"
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
import { getFormattedDate, getFormattedTime } from "@/lib/time-utils"

import { MyDayView } from "@/components/dashboard-views/my-day-view"
import { OverviewView } from "@/components/dashboard-views/overview-view"
import { ClientsView } from "@/components/dashboard-views/clients-view"
import { PipelineView } from "@/components/dashboard-views/pipeline-view"
import { MeetingsView } from "@/components/dashboard-views/meetings-view"
import { ReportsView } from "@/components/dashboard-views/reports-view"
import { AdminTasksView } from "@/components/dashboard-views/admin-tasks-view"
import { FinanceView } from "@/components/dashboard-views/finance-view"
import { SalesView } from "@/components/dashboard-views/sales-view" // New Import


import { Task, UserProfile, Stats } from "@/lib/types" // Using shared types
import { VAFinance } from "@/components/dashboard-views/va-finance"

import { ProjectListView } from "@/components/projects/project-list-view"
import { ProjectDetailView } from "@/components/projects/project-detail-view"
import { VASOPs } from "@/components/dashboard-views/va-sops"

import { Receipt, Boxes } from "lucide-react"

export function AdminDashboard({
  userId,
  userName,
  userRole = 'admin'
}: {
  userId: string
  userName: string
  userRole?: string
}) {
  const supabase = createClient()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<UserProfile[]>([]) // Use UserProfile instead of Member
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [activeView, setActiveView] = useState<"my-day" | "overview" | "tasks" | "team" | "clients" | "deals" | "meetings" | "reports" | "quotes" | "finance" | "invoices" | "projects" | "sops" | "payments" | "expenses" | "pipeline" | "sales">("my-day")

  const [stats, setStats] = useState<any>(null) // Stats type in lib/types might differ from local usage, safe with any for now or check
  const [taskFilter, setTaskFilter] = useState<"all" | "active" | "completed">("all")
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  // Review Modal State
  const [reviewingTask, setReviewingTask] = useState<Task | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const loadData = useCallback(async () => {
    try {
      // Load profile
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).single()
      setProfile(profileData)

      // Load tasks (admin can see all tasks)
      const tasksResponse = await fetch("/api/admin/tasks")
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json()
        setTasks(Array.isArray(tasksData) ? tasksData : [])
      }

      // Load team members
      const membersResponse = await fetch("/api/admin/members")
      if (membersResponse.ok) {
        const membersData = await membersResponse.json()
        setMembers(Array.isArray(membersData) ? membersData : [])
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
    const member = members.find((m: UserProfile) => m.id === memberId)
    return member?.full_name || "Unknown"
  }

  const pendingTasks = tasks.filter((t: Task) => t.approval_status === "pending")
  const filteredTasks = tasks.filter((task: Task) => {
    if (taskFilter === "all") return true
    if (taskFilter === "active") return task.status !== "completed"
    if (taskFilter === "completed") return task.status === "completed"
    return true
  })

  // Safe access to length properties
  const taskStats = {
    total: tasks.length,
    active: tasks.filter((t: Task) => t.status !== "completed").length,
    completed: tasks.filter((t: Task) => t.status === "completed").length,
    pending: pendingTasks.length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    )
  }

  // Filter Menu Items based on Role
  const menuItems = getNavItemsForRole(userRole as any).map(item => ({
    ...item,
    badge: item.id === 'tasks' ? taskStats.active : item.id === 'team' ? members.length : undefined
  }))

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
            Admin Panel
          </h2>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-accent/10 rounded-lg md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
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
                className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 
                    ${isActive
                    ? "bg-slate-100 text-slate-900 font-semibold shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                title={item.label}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={`shrink-0 transition-colors ${isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`}
                />
                <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"} transition-opacity duration-200 flex-1 text-left text-sm`}>
                  {item.label}
                </span>

                {item.badge !== undefined && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto border
                      ${isActive
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                    } ${!isSidebarOpen && "md:hidden lg:block"}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="p-4 bg-card border-t border-border/10 space-y-1">
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
        {/* Header - Slim Mobile First */}
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
                  {APP_NAME}
                </h1>
                <p className="text-xs text-muted-foreground hidden md:block">
                  Welcome, {userName} • <span className="text-blue-600 font-medium">{getFormattedDate()}</span> • <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{getFormattedTime()}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <NotificationBell userId={userId} isAdmin={true} />
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
              {typeof window !== 'undefined' && (new Date().getHours() < 12 ? "Good Morning" : new Date().getHours() < 18 ? "Good Afternoon" : "Good Evening")},
              <span className="font-medium text-foreground"> {userName?.split(' ')?.[0] || 'User'}</span>
            </p>
          </div>

          {activeView === "sales" && <SalesView />}

          {/* Finance handles existing Finance logic + Expenses */}
          {activeView === "finance" && (
            userRole === 'admin' ? <FinanceView /> : <VAFinance userName={userName} userRole={userRole} />
          )}

          {activeView === "projects" && (
            selectedProjectId ? (
              <ProjectDetailView projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />
            ) : (
              <ProjectListView userId={userId} onSelectProject={setSelectedProjectId} />
            )
          )}
          {activeView === "sops" && <VASOPs />}

          {/* Existing Views */}
          {activeView === "my-day" && (
            <MyDayView userId={userId} userName={userName} />
          )}

          {activeView === "overview" && (
            <OverviewView
              stats={stats}
              taskStats={taskStats}
              membersCount={members.length}
              setActiveView={setActiveView as any}
            />
          )}

          {activeView === "clients" && (
            <ClientsView />
          )}



          {activeView === "meetings" && (
            <MeetingsView />
          )}

          {activeView === "reports" && (
            <ReportsView />
          )}

          {activeView === "tasks" && (
            <AdminTasksView
              tasks={tasks}
              members={members}
              onUpdateTask={setEditingTask}
              onDeleteTask={handleDeleteTask}
              onCreateTask={() => setShowCreateTask(true)}
              onReviewTask={setReviewingTask}
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
        </main>
      </div>
    </div>
  )
}
