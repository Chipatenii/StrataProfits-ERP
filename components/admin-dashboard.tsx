"use client"
import { APP_NAME } from "@/lib/config"
import { getNavItemsForRole } from "@/lib/navigation"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  LogOut,
  Settings,
  Menu,
  X,
  Loader2} from "lucide-react"
import { UserProfileCard } from "./user-profile-card"
import { ProfileSettingsModal } from "./profile-settings-modal"
import { NotificationBell } from "./notification-bell"
import { ThemeToggle } from "./theme-toggle"
import { AdminEditTaskModal } from "./modals/admin-edit-task-modal"
import { AdminCreateTaskModal } from "./modals/admin-create-task-modal"
import { AdminReviewTaskModal } from "./modals/admin-review-task-modal"
import { ConfirmModal } from "./modals/confirm-modal"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"
import { approveTask, rejectTask, verifyTask } from "@/app/actions/tasks"
import { toast } from "sonner"
import { getFormattedDate } from "@/lib/time-utils"

import { MyDayView } from "@/components/dashboard-views/my-day-view"
import { OverviewView } from "@/components/dashboard-views/overview-view"
import { ClientsView } from "@/components/dashboard-views/clients-view"
import { MeetingsView } from "@/components/dashboard-views/meetings-view"
import { ReportsView } from "@/components/dashboard-views/reports-view"
import { AdminTasksView } from "@/components/dashboard-views/admin-tasks-view"
import { FinanceView } from "@/components/dashboard-views/finance-view"
import { SalesView } from "@/components/dashboard-views/sales-view"

import { Task, UserProfile } from "@/lib/types"
import { VAFinance } from "@/components/dashboard-views/va-finance"

import { ProjectListView } from "@/components/projects/project-list-view"
import { ProjectDetailView } from "@/components/projects/project-detail-view"
import { TeamView } from "@/components/dashboard-views/team-view"
import { VASOPs } from "@/components/dashboard-views/va-sops"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import { LayoutDashboard, ListTodo, Users, Wallet } from "lucide-react"


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
  const [activeView, setActiveView] = useState<"my-day" | "overview" | "tasks" | "team" | "clients" | "deals" | "meetings" | "reports" | "quotes" | "finance" | "invoices" | "projects" | "sops" | "payments" | "expenses" | "pipeline" | "sales">("overview")

  const [stats, setStats] = useState<any>(null) // Stats type in lib/types might differ from local usage, safe with any for now or check
  const [taskFilter, setTaskFilter] = useState<"all" | "active" | "completed">("all")
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  // Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean
    title: string
    description: string
    action: () => Promise<void> | void
    variant?: "default" | "destructive"
    confirmText?: string
  }>({
    isOpen: false,
    title: "",
    description: "",
    action: () => { },
  })

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
    setConfirmConfig({
      isOpen: true,
      title: "Delete Task",
      description: "Are you sure you want to delete this task? This action cannot be undone.",
      variant: "destructive",
      confirmText: "Delete",
      action: async () => {
        try {
          const response = await fetch(`/api/admin/tasks?id=${taskId}`, {
            method: "DELETE",
          })

          if (response.ok) {
            toast.success("Task deleted successfully")
            loadData()
          } else {
            toast.error("Failed to delete task")
          }
        } catch (error) {
          console.error("Error deleting task:", error)
          toast.error("An error occurred")
        }
        setConfirmConfig(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  const handleDeleteMember = async (memberId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete Team Member",
      description: "Are you sure you want to delete this team member? This action cannot be undone and will remove all their data.",
      variant: "destructive",
      confirmText: "Delete Member",
      action: async () => {
        try {
          const response = await fetch(`/api/admin/members/${memberId}`, {
            method: "DELETE",
          })

          if (response.ok) {
            toast.success("Member deleted successfully")
            loadData()
          } else {
            toast.error("Failed to delete member")
          }
        } catch (error) {
          console.error("Error deleting member:", error)
          toast.error("An error occurred")
        }
        setConfirmConfig(prev => ({ ...prev, isOpen: false }))
      }
    })
  }

  // Review Actions
  const handleVerifyTask = async (task: Task) => {
    setIsProcessing(true)
    try {
      const result = await verifyTask(task.id)
      if (result.success) {
        toast.success("Task verified successfully")
        setReviewingTask(null)
        loadData()
      } else {
        toast.error("Failed to verify task")
      }
    } catch (error) {
      console.error("Error verifying task:", error)
      toast.error("An error occurred")
    } finally {
      setIsProcessing(false)
    }
  }

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
    setConfirmConfig({
      isOpen: true,
      title: "Reject Task",
      description: "Are you sure you want to reject this task? This action cannot be undone.",
      variant: "destructive",
      confirmText: "Reject",
      action: async () => {
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
          setConfirmConfig(prev => ({ ...prev, isOpen: false }))
        }
      }
    })
  }


  const pendingTasks = tasks.filter((t: Task) => t.approval_status === "pending")

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
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Filter Menu Items based on Role
  const menuItems = getNavItemsForRole(userRole as any).map(item => ({
    ...item,
    badge: item.id === 'tasks' ? taskStats.active : item.id === 'team' ? members.length : undefined
  }))

  // Filter out admin from assignable members (allow team members and VAs)
  const assignableMembers = members.filter(m =>
    m.role !== 'admin'
  )

  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <div className={`
        fixed md:relative z-50 h-full
        transition-all duration-300 ease-out
        bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl md:shadow-xl flex flex-col
        ${isSidebarOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0 md:w-20 lg:w-72"}
      `}>
        {/* Premium Branded Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_50%)]" />
          <div className="relative p-4 flex items-center justify-between h-20">
            <div className={`flex items-center gap-3 ${!isSidebarOpen && "md:hidden lg:flex"}`}>
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg border border-white/30 shadow-lg">
                S
              </div>
              <div className="text-white">
                <h2 className="font-bold text-lg leading-tight">Admin Panel</h2>
                <p className="text-xs text-emerald-100/80">StrataForge Business Suite</p>
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
                className={`sidebar-icon-btn group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 min-h-[48px]
                    ${isActive
                    ? "bg-primary/10 text-primary font-semibold shadow-sm dark:bg-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                title={item.label}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 2}
                  data-tooltip={item.label}
                  className={`shrink-0 transition-colors ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
                />
                <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"} transition-opacity duration-200 flex-1 text-left text-sm`}>
                  {item.label}
                </span>

                {item.badge !== undefined && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto
                      ${isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                    } ${!isSidebarOpen && "md:hidden lg:block"}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-1">
          <button
            onClick={() => setShowProfileSettings(true)}
            className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 min-h-[48px]"
            title="Settings"
          >
            <Settings size={20} className="shrink-0 transition-colors" />
            <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"} text-sm font-medium`}>Settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 transition-all duration-200 min-h-[48px]"
            title="Sign Out"
          >
            <LogOut size={20} className="shrink-0 transition-colors" />
            <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"} text-sm font-medium`}>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-emerald-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/30">
        {/* Header - Premium */}
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
                  Welcome back, <span className="font-medium text-foreground">{userName}</span> • <span className="text-emerald-600 dark:text-emerald-400 font-medium">{getFormattedDate()}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <ThemeToggle />
              <NotificationBell userId={userId} isAdmin={true} />
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
            <TeamView
              members={members}
              tasks={tasks}
              onEditMember={setEditingMember}
              onDeleteMember={handleDeleteMember}
            />
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
              members={assignableMembers}
              onOpenChange={(open) => !open && setEditingTask(null)}
              onSuccess={loadData}
            />
          )}

          {/* Create Task Modal */}
          {showCreateTask && (
            <AdminCreateTaskModal
              open={showCreateTask}
              members={assignableMembers}
              userId={userId}
              userRole={userRole}
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
              onVerify={handleVerifyTask}
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

          <ConfirmModal
            open={confirmConfig.isOpen}
            onOpenChange={(open) => setConfirmConfig(prev => ({ ...prev, isOpen: open }))}
            title={confirmConfig.title}
            description={confirmConfig.description}
            onConfirm={confirmConfig.action}
            confirmText={confirmConfig.confirmText}
            variant={confirmConfig.variant}
          />
        </main>

        {/* Mobile Bottom Nav for Admin */}
        <MobileBottomNav
          activeView={activeView}
          onViewChange={(view) => setActiveView(view as any)}
          items={[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'tasks', label: 'Tasks', icon: ListTodo },
            { id: 'team', label: 'Team', icon: Users },
            { id: 'finance', label: 'Finance', icon: Wallet },
          ]}
        />
      </div>
    </div>
  )
}
