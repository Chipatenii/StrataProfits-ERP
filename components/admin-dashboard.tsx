"use client"
import { getNavItemsForRole } from "@/lib/navigation"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, useCallback } from "react"
import { Loader2 } from "lucide-react"
import { AdminEditTaskModal } from "./modals/admin-edit-task-modal"
import { AdminCreateTaskModal } from "./modals/admin-create-task-modal"
import { AdminReviewTaskModal } from "./modals/admin-review-task-modal"
import { ConfirmModal } from "./modals/confirm-modal"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"
import { approveTask, rejectTask, verifyTask, rejectCompletedTask } from "@/app/actions/tasks"
import { toast } from "sonner"

import { MyDayView } from "@/components/dashboard-views/my-day-view"
import { OverviewView } from "@/components/dashboard-views/overview-view"
import { ClientsView } from "@/components/dashboard-views/clients-view"
import { MeetingsView } from "@/components/dashboard-views/meetings-view"
import { ReportsView } from "@/components/dashboard-views/reports-view"
import { AdminTasksView } from "@/components/dashboard-views/admin-tasks-view"
import { FinanceView } from "@/components/dashboard-views/finance-view"
import { AccountingView } from "@/components/dashboard-views/accounting-view"
import { SalesView } from "@/components/dashboard-views/sales-view"
import { FilesView } from "@/components/dashboard-views/files-view"
import { HRView } from "@/components/dashboard-views/hr-view"
import { TeamPerformanceView } from "@/components/dashboard-views/team-performance-view"
import { DailyCheckInView } from "@/components/dashboard-views/daily-checkin-view"

import { Task, UserProfile, Stats } from "@/lib/types"
import { VAFinance } from "@/components/dashboard-views/va-finance"

import { ProjectListView } from "@/components/projects/project-list-view"
import { ProjectDetailView } from "@/components/projects/project-detail-view"
import { TeamView } from "@/components/dashboard-views/team-view"
import { VASOPs } from "@/components/dashboard-views/va-sops"
import { LayoutDashboard, ListTodo, Users, Wallet } from "lucide-react"
import { DashboardShell } from "./dashboard-shell"

type AdminView = "my-day" | "overview" | "tasks" | "team" | "clients" | "deals" | "meetings" | "reports" | "quotes" | "finance" | "accounting" | "invoices" | "projects" | "sops" | "payments" | "expenses" | "pipeline" | "sales" | "files" | "hr" | "performance" | "checkins"

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
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<UserProfile[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<AdminView>("overview")

  const [stats, setStats] = useState<Stats | null>(null)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showCreateTask, setShowCreateTask] = useState(false)
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

  const loadData = useCallback(async () => {
    try {
      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).single()
      setProfile(profileData)

      const tasksResponse = await fetch("/api/admin/tasks")
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json()
        setTasks(Array.isArray(tasksData) ? tasksData : [])
      }

      const membersResponse = await fetch("/api/admin/members")
      if (membersResponse.ok) {
        const membersData = await membersResponse.json()
        setMembers(Array.isArray(membersData) ? membersData : [])
      }

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
  }, [loadData])

  // Real-time subscriptions
  useRealtimeSubscription("tasks", loadData)
  useRealtimeSubscription("profiles", loadData)
  useRealtimeSubscription("time_logs", loadData)

  const handleDeleteTask = async (taskId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete Task",
      description: "Are you sure you want to delete this task? This action cannot be undone.",
      variant: "destructive",
      confirmText: "Delete",
      action: async () => {
        try {
          const response = await fetch(`/api/admin/tasks?id=${taskId}`, { method: "DELETE" })
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

  const handleRejectCompletedTask = async (task: Task) => {
    setConfirmConfig({
      isOpen: true,
      title: "Return Task for Rework",
      description: "Are you sure you want to return this task for rework? This will invalidate the time logs for this task until resubmitted.",
      variant: "destructive",
      confirmText: "Return for Rework",
      action: async () => {
        setIsProcessing(true)
        try {
          const result = await rejectCompletedTask(task.id)
          if (result.success) {
            toast.success("Task returned for rework")
            setReviewingTask(null)
            loadData()
          } else {
            toast.error("Failed to return task")
          }
        } catch (error) {
          console.error("Error returning task:", error)
          toast.error("An error occurred")
        } finally {
          setIsProcessing(false)
          setConfirmConfig(prev => ({ ...prev, isOpen: false }))
        }
      }
    })
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

  const normalizeStatus = (s?: string) => s?.toLowerCase().trim() || ""
  const taskStats = {
    total: tasks.length,
    active: tasks.filter((t) => {
      const s = normalizeStatus(t.status)
      return s !== "completed" && s !== "verified"
    }).length,
    completed: tasks.filter((t) => {
      const s = normalizeStatus(t.status)
      return s === "completed" || s === "verified"
    }).length,
    pending: tasks.filter((t) => {
      const s = normalizeStatus(t.status)
      const a = normalizeStatus(t.approval_status)
      return s === "pending_approval" || s === "completed" || a === "pending"
    }).length,
  }

  const menuItems = getNavItemsForRole(userRole as UserProfile["role"]).map(item => ({
    ...item,
    badge: item.id === 'tasks' ? taskStats.active : item.id === 'team' ? members.length : undefined
  }))

  const assignableMembers = members.filter(m => m.role !== 'admin')

  const mobileNavItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'finance', label: 'Finance', icon: Wallet },
  ]

  return (
    <DashboardShell
      userId={userId}
      userName={userName}
      userRole={userRole}
      profile={profile}
      brandLabel="Admin Panel"
      brandInitials="S"
      menuItems={menuItems}
      activeView={activeView}
      onViewChange={(view) => setActiveView(view as AdminView)}
      mobileNavItems={mobileNavItems}
      loading={loading}
      isAdmin={true}
    >
      {activeView === "sales" && <SalesView />}
      {activeView === "finance" && (
        userRole === 'admin' ? <FinanceView /> : <VAFinance userName={userName} userRole={userRole} />
      )}
      {activeView === "accounting" && <AccountingView />}
      {activeView === "projects" && (
        selectedProjectId ? (
          <ProjectDetailView projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />
        ) : (
          <ProjectListView userId={userId} onSelectProject={setSelectedProjectId} />
        )
      )}
      {activeView === "sops" && <VASOPs />}
      {activeView === "files" && <FilesView />}
      {activeView === "hr" && <HRView />}
      {activeView === "my-day" && <MyDayView userId={userId} userName={userName} />}
      {activeView === "overview" && (
        <OverviewView
          stats={stats as any}
          taskStats={taskStats}
          membersCount={members.length}
          setActiveView={(view: string) => setActiveView(view as AdminView)}
        />
      )}
      {activeView === "clients" && <ClientsView />}
      {activeView === "meetings" && <MeetingsView />}
      {activeView === "reports" && <ReportsView />}
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
      {activeView === "performance" && <TeamPerformanceView />}
      {activeView === "team" && <TeamView userId={userId} />}
      {activeView === "checkins" && <DailyCheckInView userId={userId} userName={userName} />}

      {/* Modals */}
      {editingTask && (
        <AdminEditTaskModal
          open={!!editingTask}
          task={editingTask}
          members={assignableMembers}
          onOpenChange={(open) => !open && setEditingTask(null)}
          onSuccess={loadData}
        />
      )}
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
      {reviewingTask && (
        <AdminReviewTaskModal
          open={!!reviewingTask}
          task={reviewingTask}
          onOpenChange={(open) => !open && setReviewingTask(null)}
          onApprove={handleApproveTask}
          onReject={handleRejectTask}
          onVerify={handleVerifyTask}
          onRejectCompletion={handleRejectCompletedTask}
          isProcessing={isProcessing}
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
    </DashboardShell>
  )
}
