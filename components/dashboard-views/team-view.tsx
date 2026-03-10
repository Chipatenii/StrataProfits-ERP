"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Users, Mail, Phone, Clock, Edit, Trash2, Search, UserPlus, Briefcase, CheckCircle2, ListTodo, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserProfile, Task } from "@/lib/types"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"
import { ProfileSettingsModal } from "@/components/profile-settings-modal"
import { ConfirmModal } from "@/components/modals/confirm-modal"
import { toast } from "sonner"

interface TeamViewProps {
    userId: string
}

// All known roles for display
const ROLE_FILTERS = [
    { id: "all", label: "All" },
    { id: "admin", label: "Admin" },
    { id: "virtual_assistant", label: "VA" },
    { id: "developer", label: "Developer" },
    { id: "marketing", label: "Marketing" },
    { id: "sales", label: "Sales" },
    { id: "graphic_designer", label: "Designer" },
    { id: "social_media_manager", label: "Social Media" },
    { id: "book_keeper", label: "Bookkeeper" },
    { id: "team_member", label: "Team Member" },
] as const

const ROLE_COLORS: Record<string, string> = {
    admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    virtual_assistant: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    developer: "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300",
    marketing: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    sales: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    graphic_designer: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
    social_media_manager: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
    book_keeper: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
    team_member: "bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300",
}

function getRoleColor(role?: string | null) {
    return ROLE_COLORS[role?.toLowerCase() || ""] || "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400"
}

function formatRole(role?: string | null) {
    if (!role) return "Member"
    return role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

function getWorkloadColor(activeTasks: number) {
    if (activeTasks === 0) return "bg-slate-300 dark:bg-slate-600"
    if (activeTasks <= 2) return "bg-emerald-500"
    if (activeTasks <= 5) return "bg-amber-500"
    return "bg-red-500"
}

function getWorkloadLabel(activeTasks: number) {
    if (activeTasks === 0) return "Idle"
    if (activeTasks <= 2) return "Light"
    if (activeTasks <= 5) return "Moderate"
    return "Heavy"
}

// --- Loading Skeleton ---
function TeamSkeleton() {
    return (
        <div className="space-y-8 animate-fade-in">
            {/* Hero skeleton */}
            <div className="rounded-3xl bg-primary/80 p-8 md:p-10 h-[260px] animate-pulse" />
            {/* Search bar skeleton */}
            <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
            {/* Cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-3xl p-6 h-[280px] animate-pulse border border-slate-200/50 dark:border-slate-800" />
                ))}
            </div>
        </div>
    )
}

export function TeamView({ userId }: TeamViewProps) {
    // --- State ---
    const [members, setMembers] = useState<UserProfile[]>([])
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearch] = useState("")
    const [roleFilter, setRoleFilter] = useState("all")
    const [editingMember, setEditingMember] = useState<UserProfile | null>(null)
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

    // --- Data Fetching ---
    const loadData = useCallback(async (isInitial = false) => {
        if (isInitial) {
            setLoading(true)
            setError(null)
        }
        try {
            const [membersRes, tasksRes] = await Promise.all([
                fetch("/api/admin/members"),
                fetch("/api/admin/tasks"),
            ])

            if (!membersRes.ok) throw new Error("Failed to fetch team members")
            if (!tasksRes.ok) throw new Error("Failed to fetch tasks")

            const membersData = await membersRes.json()
            const tasksData = await tasksRes.json()

            setMembers(Array.isArray(membersData) ? membersData : [])
            setTasks(Array.isArray(tasksData) ? tasksData : [])
        } catch (err: any) {
            console.error("TeamView load error:", err)
            if (isInitial) setError(err.message || "Failed to load team data")
        } finally {
            if (isInitial) setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData(true)
    }, [loadData])

    // Real-time subscriptions
    useRealtimeSubscription("profiles", () => loadData(false))
    useRealtimeSubscription("tasks", () => loadData(false))

    // --- Delete handler with confirmation ---
    const handleDeleteMember = (member: UserProfile) => {
        if (member.id === userId) return // Self-delete protection
        setConfirmConfig({
            isOpen: true,
            title: "Delete Team Member",
            description: `Are you sure you want to remove ${member.full_name || "this member"}? This action cannot be undone and will remove all their data.`,
            variant: "destructive",
            confirmText: "Delete Member",
            action: async () => {
                try {
                    const response = await fetch(`/api/admin/members/${member.id}`, {
                        method: "DELETE",
                    })
                    if (response.ok) {
                        toast.success("Member removed successfully")
                        loadData(false)
                    } else {
                        toast.error("Failed to remove member")
                    }
                } catch (error) {
                    console.error("Error deleting member:", error)
                    toast.error("An error occurred")
                }
                setConfirmConfig(prev => ({ ...prev, isOpen: false }))
            },
        })
    }

    // --- Filtering & Search ---
    const filteredMembers = useMemo(() => {
        return members.filter(m => {
            const matchesSearch =
                !search ||
                m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                m.email?.toLowerCase().includes(search.toLowerCase())

            const matchesRole =
                roleFilter === "all" ||
                m.role?.toLowerCase() === roleFilter

            return matchesSearch && matchesRole
        })
    }, [members, search, roleFilter])

    // --- Dynamic Stats ---
    const stats = useMemo(() => {
        const totalActive = tasks.filter(t => t.status !== "completed").length
        const totalCompleted = tasks.filter(t => t.status === "completed").length
        // Count unique roles
        const roles = new Set(members.map(m => m.role).filter(Boolean))
        return {
            totalMembers: members.length,
            totalRoles: roles.size,
            activeTasks: totalActive,
            completedTasks: totalCompleted,
        }
    }, [members, tasks])

    // Role filter tabs — only show roles that actually have members
    const activeRoleFilters = useMemo(() => {
        const memberRoles = new Set(members.map(m => m.role?.toLowerCase()))
        return ROLE_FILTERS.filter(f => f.id === "all" || memberRoles.has(f.id))
    }, [members])

    // --- Loading & Error States ---
    if (loading) return <TeamSkeleton />

    if (error) {
        return (
            <div className="space-y-8 animate-fade-in">
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-xl shadow-black/5 dark:shadow-black/20">
                    <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-1">Failed to load team</h3>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button onClick={() => loadData(true)} variant="outline">
                        Try Again
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* ═══ Premium Hero Header ═══ */}
            <div className="relative overflow-hidden rounded-3xl bg-primary p-8 md:p-10 text-white shadow-2xl shadow-purple-500/30">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-5 h-5 text-violet-200" />
                            <span className="text-sm font-medium text-violet-100 uppercase tracking-wider">Workforce</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">Team Members</h1>
                        <p className="text-violet-100/80 text-lg">Manage team roles, assignments, and performance</p>
                    </div>
                </div>

                {/* Dynamic Stats */}
                <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center">
                        <p className="text-3xl font-bold">{stats.totalMembers}</p>
                        <p className="text-sm text-violet-100/80">Total Members</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center">
                        <p className="text-3xl font-bold">{stats.totalRoles}</p>
                        <p className="text-sm text-violet-100/80">Roles</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center">
                        <p className="text-3xl font-bold">{stats.activeTasks}</p>
                        <p className="text-sm text-violet-100/80">Active Tasks</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center">
                        <p className="text-3xl font-bold">{stats.completedTasks}</p>
                        <p className="text-sm text-violet-100/80">Completed</p>
                    </div>
                </div>
            </div>

            {/* ═══ Search & Filter Bar ═══ */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary shadow-sm transition-all text-sm"
                    />
                </div>
            </div>

            {/* Role Filter Tabs */}
            <div className="flex gap-1.5 flex-wrap">
                {activeRoleFilters.map(filter => (
                    <button
                        key={filter.id}
                        onClick={() => setRoleFilter(filter.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${roleFilter === filter.id
                            ? "bg-primary text-white shadow-md shadow-primary/30"
                            : "bg-white dark:bg-slate-900 text-muted-foreground hover:text-foreground border border-slate-200 dark:border-slate-800 hover:border-primary/30"
                            }`}
                    >
                        {filter.label}
                        {filter.id !== "all" && (
                            <span className="ml-1.5 opacity-70">
                                {members.filter(m => m.role?.toLowerCase() === filter.id).length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ═══ Member Cards ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMembers.length === 0 ? (
                    <div className="col-span-full text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-xl shadow-black/5 dark:shadow-black/20">
                        <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground">
                            {members.length === 0 ? "No team members found" : "No matching members"}
                        </h3>
                        <p className="text-muted-foreground">
                            {members.length === 0
                                ? "Invite members to grow your team."
                                : "Try adjusting your search or filters."}
                        </p>
                    </div>
                ) : (
                    filteredMembers.map((member, index) => {
                        const memberTasks = tasks.filter((t) => t.assigned_to === member.id)
                        const activeTasks = memberTasks.filter(t => t.status !== "completed").length
                        const completedTasks = memberTasks.filter(t => t.status === "completed").length
                        const isCurrentUser = member.id === userId
                        const completionRate = memberTasks.length > 0 ? Math.round((completedTasks / memberTasks.length) * 100) : 0

                        return (
                            <div
                                key={member.id}
                                className={`group bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden ${isCurrentUser ? "ring-2 ring-primary/30" : ""}`}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {/* Top Accent */}
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />

                                {/* You badge */}
                                {isCurrentUser && (
                                    <div className="absolute top-3.5 right-4 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                        You
                                    </div>
                                )}

                                <div className="flex items-start justify-between mb-5 pt-2">
                                    <div className="flex items-center gap-4">
                                        {/* Avatar with workload indicator */}
                                        <div className="relative">
                                            {member.avatar_url ? (
                                                <img
                                                    src={member.avatar_url}
                                                    alt={member.full_name || "Avatar"}
                                                    className="w-14 h-14 rounded-2xl object-cover shadow-inner"
                                                />
                                            ) : (
                                                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-600 dark:text-slate-300 shadow-inner">
                                                    {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                                                </div>
                                            )}
                                            {/* Workload dot */}
                                            <div
                                                className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${getWorkloadColor(activeTasks)}`}
                                                title={`${getWorkloadLabel(activeTasks)} workload (${activeTasks} active tasks)`}
                                            />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-foreground leading-tight">{member.full_name || "Unnamed"}</h3>
                                            <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider mt-1 ${getRoleColor(member.role)}`}>
                                                {formatRole(member.role)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action buttons — visible on mobile always, hover on desktop */}
                                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setEditingMember(member)
                                            }}
                                            className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                                            title="Edit member"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        {!isCurrentUser && member.role !== "admin" && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDeleteMember(member)
                                                }}
                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                                title="Remove member"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="space-y-2.5 mb-5">
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                                        <Mail className="w-4 h-4 text-violet-500 shrink-0" />
                                        <span className="truncate">{member.email || "No email"}</span>
                                    </div>
                                    {(member as any).phone && (
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                                            <Phone className="w-4 h-4 text-violet-500 shrink-0" />
                                            <span>{(member as any).phone}</span>
                                        </div>
                                    )}
                                    {member.hourly_rate !== null && member.hourly_rate !== undefined && (
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                                            <Briefcase className="w-4 h-4 text-violet-500 shrink-0" />
                                            <span>${member.hourly_rate}/hr</span>
                                        </div>
                                    )}
                                </div>

                                {/* Task Stats with progress bar */}
                                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Active</p>
                                            <p className="text-lg font-bold text-foreground">{activeTasks}</p>
                                        </div>
                                        <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Done</p>
                                            <p className="text-lg font-bold text-foreground">{completedTasks}</p>
                                        </div>
                                        <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Rate</p>
                                            <p className="text-lg font-bold text-foreground">{completionRate}%</p>
                                        </div>
                                    </div>

                                    {/* Completion progress bar */}
                                    {memberTasks.length > 0 && (
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
                                                style={{ width: `${completionRate}%` }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        Joined {(member as any).created_at ? new Date((member as any).created_at).toLocaleDateString() : "N/A"}
                                    </span>
                                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${getWorkloadColor(activeTasks) === "bg-slate-300 dark:bg-slate-600"
                                        ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                        : getWorkloadColor(activeTasks) === "bg-emerald-500"
                                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                                            : getWorkloadColor(activeTasks) === "bg-amber-500"
                                                ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                                                : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                        }`}>
                                        {getWorkloadLabel(activeTasks)}
                                    </span>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* ═══ Modals ═══ */}

            {/* Edit Member Modal */}
            {editingMember && (
                <ProfileSettingsModal
                    userId={editingMember.id}
                    isAdmin={true}
                    onClose={() => setEditingMember(null)}
                    onSuccess={() => {
                        setEditingMember(null)
                        loadData(false)
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                open={confirmConfig.isOpen}
                onOpenChange={(open) => setConfirmConfig(prev => ({ ...prev, isOpen: open }))}
                title={confirmConfig.title}
                description={confirmConfig.description}
                onConfirm={confirmConfig.action}
                confirmText={confirmConfig.confirmText}
                variant={confirmConfig.variant}
            />
        </div>
    )
}
