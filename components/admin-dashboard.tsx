"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { LogOut, Plus, Trash2, UserCog, Settings, Clock, AlertTriangle, Menu, X, DollarSign, TrendingUp, CheckCircle2 } from "lucide-react"
import { ProfileSettingsModal } from "@/components/profile-settings-modal"
import { NotificationBell } from "@/components/notification-bell"
import { TimeAllocationIndicator } from "@/components/time-allocation-indicator"
import { calculateTimeSpent, formatDuration, getTimeStatus, getTimeStatusColor } from "@/lib/time-utils"

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string
  assigned_to: string | null
  due_date: string
  estimated_hours: number | null
  completed_at: string | null
  completion_notes: string | null
}

interface TeamMember {
  id: string
  full_name: string
  email: string
  role: string
  hourly_rate: number
}

const ROLE_OPTIONS = [
  { value: "team_member", label: "Team Member" },
  { value: "admin", label: "Admin" },
  { value: "graphic_designer", label: "Graphic Designer" },
  { value: "virtual_assistant", label: "Virtual Assistant" },
  { value: "social_media_manager", label: "Social Media Manager" },
  { value: "developer", label: "Developer" },
  { value: "bookkeeper", label: "Bookkeeper" },
]

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
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskDescription, setNewTaskDescription] = useState("")
  const [newTaskPriority, setNewTaskPriority] = useState("medium")
  const [newTaskAssignee, setNewTaskAssignee] = useState("")
  const [newTaskEstimatedHours, setNewTaskEstimatedHours] = useState("")
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [editingMemberRole, setEditingMemberRole] = useState("")
  const [editingMemberRate, setEditingMemberRate] = useState("")
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [timeLogs, setTimeLogs] = useState<any[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    loadData()

    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      loadData()
    }, 30000)

    // Refresh when window regains focus
    const handleFocus = () => {
      loadData()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const membersResponse = await fetch("/api/admin/members")
      const membersData = await membersResponse.json()
      setTeamMembers(membersData || [])

      const tasksResponse = await fetch("/api/admin/tasks")
      const tasksData = await tasksResponse.json()
      setTasks(tasksData || [])

      // Load time logs for all tasks
      const { data: logsData } = await supabase.from("time_logs").select("*")
      setTimeLogs(logsData || [])

      setLoading(false)
    } catch (error) {
      console.error("Error loading data:", error)
      setLoading(false)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const estimatedHours = newTaskEstimatedHours ? parseFloat(newTaskEstimatedHours) : null

      const response = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDescription,
          priority: newTaskPriority,
          assigned_to: newTaskAssignee || null,
          created_by: userId,
          estimated_hours: estimatedHours,
        }),
      })

      if (response.ok) {
        setNewTaskTitle("")
        setNewTaskDescription("")
        setNewTaskPriority("medium")
        setNewTaskAssignee("")
        setNewTaskEstimatedHours("")
        setShowCreateTask(false)
        loadData()
      }
    } catch (error) {
      console.error("Error creating task:", error)
    }
  }

  const handleUpdateMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editingMemberRole,
          hourly_rate: parseFloat(editingMemberRate) || 0
        }),
      })
      if (response.ok) {
        setEditingMemberId(null)
        loadData()
        alert("Member updated successfully")
      } else {
        const errorData = await response.json()
        alert(`Failed to update member: ${errorData.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error updating member:", error)
      alert("An error occurred while updating the member")
    }
  }

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this team member? This will permanently delete them from the database.")) return
    try {
      const response = await fetch(`/api/admin/members/${memberId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        alert("Member deleted successfully")
        loadData()
      } else {
        const errorData = await response.json()
        alert(`Failed to delete member: ${errorData.error || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error deleting member:", error)
      alert("An error occurred while deleting the member")
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await supabase.from("tasks").delete().eq("id", taskId)
      loadData()
    } catch (error) {
      console.error("Error deleting task:", error)
    }
  }

  const getRoleLabel = (role: string) => {
    return ROLE_OPTIONS.find((r) => r.value === role)?.label || role
  }

  const calculateMemberPayroll = (memberId: string) => {
    const member = teamMembers.find(m => m.id === memberId)
    if (!member) return 0

    // Calculate total minutes worked by this member
    const memberLogs = timeLogs.filter(log => log.user_id === memberId)
    const totalMinutes = memberLogs.reduce((acc, log) => acc + (log.duration_minutes || 0), 0)
    const totalHours = totalMinutes / 60

    return (totalHours * (member.hourly_rate || 0)).toFixed(2)
  }

  const getMemberTotalHours = (memberId: string) => {
    const memberLogs = timeLogs.filter(log => log.user_id === memberId)
    const totalMinutes = memberLogs.reduce((acc, log) => acc + (log.duration_minutes || 0), 0)
    return (totalMinutes / 60).toFixed(1)
  }

  const getTopPerformer = () => {
    if (teamMembers.length === 0) return null

    const performerStats = teamMembers.map(member => {
      const completedTasks = tasks.filter(t => t.assigned_to === member.id && t.status === 'completed').length
      return { member, completedTasks }
    })

    return performerStats.sort((a, b) => b.completedTasks - a.completedTasks)[0]
  }

  const topPerformer = getTopPerformer()

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
      <header className="bg-white border-b border-border shadow-sm relative">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Ostento Tracker</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Admin: {userName}</p>
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
              <a href="/reports" className="btn-secondary">
                View Reports
              </a>
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
            <a
              href="/reports"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Clock className="w-5 h-5" />
              View Reports
            </a>
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
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Top Performer</p>
              <h3 className="text-xl font-bold mt-1">
                {topPerformer ? topPerformer.member.full_name : "N/A"}
              </h3>
              <p className="text-xs text-green-600 mt-1">
                {topPerformer ? `${topPerformer.completedTasks} tasks completed` : "No data"}
              </p>
            </div>
            <div className="p-3 bg-amber-100 rounded-full text-amber-600">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Active Tasks</p>
              <h3 className="text-xl font-bold mt-1">
                {tasks.filter(t => t.status === 'in-progress').length}
              </h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Completed This Week</p>
              <h3 className="text-xl font-bold mt-1">
                {tasks.filter(t => t.status === 'completed' && t.completed_at && new Date(t.completed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
              </h3>
            </div>
            <div className="p-3 bg-green-100 rounded-full text-green-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Create Task Card */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex justify-between items-center">
            <button onClick={() => setShowCreateTask(!showCreateTask)} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Task
            </button>
          </div>

          {showCreateTask && (
            <form onSubmit={handleCreateTask} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Task Title</label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Enter task title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={newTaskEstimatedHours}
                    onChange={(e) => setNewTaskEstimatedHours(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="e.g. 2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  placeholder="Enter task description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Assign To</label>
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button type="submit" className="btn-primary">
                  Create Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateTask(false)}
                  className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Team Members & Payroll Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Team & Payroll</h2>
          <div className="grid gap-4">
            {teamMembers.length === 0 ? (
              <div className="glass-card rounded-lg p-8 text-center">
                <p className="text-muted-foreground">No team members found</p>
              </div>
            ) : (
              teamMembers.map((member) => (
                <div key={member.id} className="glass-card rounded-lg p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{member.full_name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${member.role === "admin" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                            }`}
                        >
                          {getRoleLabel(member.role)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{member.email}</p>

                      {/* Payroll Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{getMemberTotalHours(member.id)} hrs</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <DollarSign className="w-3 h-3" />
                          <span>ZMW {member.hourly_rate || 0}/hr</span>
                        </div>
                        <div className="font-semibold text-green-600">
                          Est. Payroll: ZMW {calculateMemberPayroll(member.id)}
                        </div>
                      </div>
                    </div>

                    {member.id !== userId && (
                      <div className="flex items-center gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                        {editingMemberId === member.id ? (
                          <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-lg border border-border w-full">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs font-medium mb-1 block">Role</label>
                                <select
                                  value={editingMemberRole}
                                  onChange={(e) => setEditingMemberRole(e.target.value)}
                                  className="w-full px-2 py-1 rounded bg-background border border-border text-sm">
                                  {ROLE_OPTIONS.map((role) => (
                                    <option key={role.value} value={role.value}>
                                      {role.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs font-medium mb-1 block">Hourly Rate (ZMW)</label>
                                <input
                                  type="number"
                                  value={editingMemberRate}
                                  onChange={(e) => setEditingMemberRate(e.target.value)}
                                  className="w-full px-2 py-1 rounded bg-background border border-border text-sm"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end mt-2">
                              <button
                                onClick={() => handleUpdateMember(member.id)}
                                className="px-3 py-1 rounded bg-green-500 text-white hover:bg-green-600 text-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingMemberId(null)}
                                className="px-3 py-1 rounded bg-muted text-foreground hover:bg-muted/80 text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingMemberId(member.id)
                                setEditingMemberRole(member.role)
                                setEditingMemberRate(member.hourly_rate?.toString() || "")
                              }}
                              className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit Member"
                            >
                              <UserCog className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMember(member.id)}
                              className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                              title="Remove Member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Tasks Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Active Tasks</h2>
          <div className="grid gap-4">
            {tasks.filter(t => t.status !== 'completed').length === 0 ? (
              <div className="glass-card rounded-lg p-8 text-center">
                <p className="text-muted-foreground">No active tasks</p>
              </div>
            ) : (
              tasks.filter(t => t.status !== 'completed').map((task) => (
                <div key={task.id} className="glass-card rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{task.title}</h3>
                      {task.description && <p className="text-muted-foreground mb-3">{task.description}</p>}
                      <div className="flex flex-wrap gap-3 items-center">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${task.status === "in-progress"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                            }`}
                        >
                          {task.status}
                        </span>
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
                        {task.assigned_to && (
                          <span className="text-sm text-muted-foreground">
                            Assigned to: {teamMembers.find((m) => m.id === task.assigned_to)?.full_name || "Unknown"}
                          </span>
                        )}
                        {task.estimated_hours && (
                          <div className="flex items-center gap-2 ml-2">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className={`text-xs px-2 py-0.5 rounded border ${getTimeStatusColor(
                              getTimeStatus(
                                calculateTimeSpent(timeLogs, task.id),
                                task.estimated_hours
                              )
                            )
                              }`}>
                              {formatDuration(calculateTimeSpent(timeLogs, task.id))} / {task.estimated_hours}h
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Time Allocation Progress Bar */}
                      {task.estimated_hours && (
                        <div className="mt-3 w-full max-w-md">
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${getTimeStatus(calculateTimeSpent(timeLogs, task.id), task.estimated_hours) === 'exceeded'
                                ? 'bg-red-500'
                                : getTimeStatus(calculateTimeSpent(timeLogs, task.id), task.estimated_hours) === 'warning'
                                  ? 'bg-amber-500'
                                  : 'bg-green-500'
                                }`}
                              style={{
                                width: `${Math.min(100, (calculateTimeSpent(timeLogs, task.id) / (task.estimated_hours * 60)) * 100)}%`
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="ml-4 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Completed Tasks Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Completed Tasks</h2>
          <div className="grid gap-4">
            {tasks.filter(t => t.status === 'completed').length === 0 ? (
              <div className="glass-card rounded-lg p-8 text-center">
                <p className="text-muted-foreground">No completed tasks</p>
              </div>
            ) : (
              tasks.filter(t => t.status === 'completed').map((task) => (
                <div key={task.id} className="glass-card rounded-lg p-6 opacity-75">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2 line-through">{task.title}</h3>
                      {task.description && <p className="text-muted-foreground mb-3">{task.description}</p>}
                      <div className="flex flex-wrap gap-3 items-center">
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                          Completed
                        </span>
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
                        {task.assigned_to && (
                          <span className="text-sm text-muted-foreground">
                            Assigned to: {teamMembers.find((m) => m.id === task.assigned_to)?.full_name || "Unknown"}
                          </span>
                        )}
                        {task.completed_at && (
                          <span className="text-xs text-muted-foreground">
                            Completed: {new Date(task.completed_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="ml-4 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
