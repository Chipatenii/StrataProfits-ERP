"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { Users, Mail, Phone, Clock, Edit, Trash2, Search, Briefcase, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserProfile } from "@/lib/types"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"
import { ProfileSettingsModal } from "@/components/profile-settings-modal"
import { ConfirmModal } from "@/components/modals/confirm-modal"
import { toast } from "sonner"

interface TeamViewProps {
    userId: string
}

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
] as const

const ROLE_COLORS: Record<string, string> = {
    admin: "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    virtual_assistant: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    developer: "bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    marketing: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    sales: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    graphic_designer: "bg-pink-50 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    social_media_manager: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    book_keeper: "bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
}

function getRoleColor(role?: string | null) {
    return ROLE_COLORS[role?.toLowerCase() || ""] || "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
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

function TeamSkeleton() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                ))}
            </div>
            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-6 h-[260px] animate-pulse border border-slate-200 dark:border-slate-800" />
                ))}
            </div>
        </div>
    )
}

export function TeamView({ userId }: TeamViewProps) {
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

    const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(); return r.json() })
    const { data: membersRaw = [], isLoading: isLoadingMembers, error: membersError, mutate: mutateMembers } = useSWR("/api/admin/members", fetcher)
    const { data: tasksRaw = [], isLoading: isLoadingTasks, error: tasksError, mutate: mutateTasks } = useSWR("/api/admin/tasks", fetcher)

    const members = Array.isArray(membersRaw) ? membersRaw : []
    const tasks = Array.isArray(tasksRaw) ? tasksRaw : []
    const loading = isLoadingMembers || isLoadingTasks
    const error = membersError?.message || tasksError?.message || null

    const loadData = () => {
        mutateMembers()
        mutateTasks()
    }

    useRealtimeSubscription("profiles", loadData)
    useRealtimeSubscription("tasks", loadData)

    const handleDeleteMember = (member: UserProfile) => {
        if (member.id === userId) return
        setConfirmConfig({
            isOpen: true,
            title: "Delete team member",
            description: `Are you sure you want to remove ${member.full_name || "this member"}? This action cannot be undone and will remove all their data.`,
            variant: "destructive",
            confirmText: "Delete member",
            action: async () => {
                try {
                    const response = await fetch(`/api/admin/members/${member.id}`, { method: "DELETE" })
                    if (response.ok) {
                        toast.success("Member removed successfully")
                        loadData()
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

    const filteredMembers = useMemo(() => {
        return members.filter(m => {
            const matchesSearch =
                !search ||
                m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                m.email?.toLowerCase().includes(search.toLowerCase())
            const matchesRole = roleFilter === "all" || m.role?.toLowerCase() === roleFilter
            return matchesSearch && matchesRole
        })
    }, [members, search, roleFilter])

    const stats = useMemo(() => {
        const isDone = (s?: string) => s === "completed" || s === "verified"
        const totalActive = tasks.filter(t => !isDone(t.status) && t.status !== "pending_approval").length
        const totalCompleted = tasks.filter(t => isDone(t.status)).length
        const roles = new Set(members.map(m => m.role).filter(Boolean))
        return {
            totalMembers: members.length,
            totalRoles: roles.size,
            activeTasks: totalActive,
            completedTasks: totalCompleted,
        }
    }, [members, tasks])

    const activeRoleFilters = useMemo(() => {
        const memberRoles = new Set(members.map(m => m.role?.toLowerCase()))
        return ROLE_FILTERS.filter(f => f.id === "all" || memberRoles.has(f.id))
    }, [members])

    if (loading) return <TeamSkeleton />

    if (error) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Failed to load team</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{error}</p>
                    <Button onClick={loadData} variant="outline">Try again</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page header */}
            <div>
                <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">Team</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage team roles, assignments, and performance.</p>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <KpiCard label="Total members" value={stats.totalMembers.toString()} />
                <KpiCard label="Roles" value={stats.totalRoles.toString()} />
                <KpiCard label="Active tasks" value={stats.activeTasks.toString()} />
                <KpiCard label="Completed" value={stats.completedTasks.toString()} accent />
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search by name or email"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-colors"
                />
            </div>

            {/* Role filter tabs */}
            <div className="flex gap-1.5 flex-wrap">
                {activeRoleFilters.map(filter => (
                    <button
                        key={filter.id}
                        onClick={() => setRoleFilter(filter.id)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${roleFilter === filter.id
                            ? "bg-emerald-700 text-white"
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
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

            {/* Member cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMembers.length === 0 ? (
                    <div className="col-span-full text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                            {members.length === 0 ? "No team members found" : "No matching members"}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {members.length === 0 ? "Invite members to grow your team." : "Try adjusting your search or filters."}
                        </p>
                    </div>
                ) : (
                    filteredMembers.map((member) => {
                        const memberTasks = tasks.filter((t) => t.assigned_to === member.id)
                        const isDone = (s?: string) => s === "completed" || s === "verified"
                        const activeTasks = memberTasks.filter(t => !isDone(t.status) && t.status !== "pending_approval").length
                        const completedTasks = memberTasks.filter(t => isDone(t.status)).length
                        const isCurrentUser = member.id === userId
                        const completionRate = memberTasks.length > 0 ? Math.round((completedTasks / memberTasks.length) * 100) : 0

                        return (
                            <div
                                key={member.id}
                                className={`group bg-white dark:bg-slate-900 rounded-xl p-5 border transition-colors ${isCurrentUser
                                    ? "border-emerald-300 dark:border-emerald-700"
                                    : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="relative shrink-0">
                                            {member.avatar_url ? (
                                                <img
                                                    src={member.avatar_url}
                                                    alt={member.full_name || "Avatar"}
                                                    className="w-12 h-12 rounded-lg object-cover"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-base font-bold text-slate-600 dark:text-slate-300">
                                                    {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                                                </div>
                                            )}
                                            <div
                                                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${getWorkloadColor(activeTasks)}`}
                                                title={`${getWorkloadLabel(activeTasks)} workload (${activeTasks} active tasks)`}
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white leading-tight truncate">
                                                    {member.full_name || "Unnamed"}
                                                </h3>
                                                {isCurrentUser && (
                                                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                        You
                                                    </span>
                                                )}
                                            </div>
                                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] uppercase font-semibold tracking-wider mt-1 ${getRoleColor(member.role)}`}>
                                                {formatRole(member.role)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-0.5 shrink-0">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setEditingMember(member)
                                            }}
                                            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                            title="Edit member"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        {!isCurrentUser && member.role !== "admin" && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDeleteMember(member)
                                                }}
                                                className="p-1.5 rounded-md text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                                title="Remove member"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate">{member.email || "No email"}</span>
                                    </div>
                                    {(member as any).phone && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span>{(member as any).phone}</span>
                                        </div>
                                    )}
                                    {member.hourly_rate !== null && member.hourly_rate !== undefined && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                            <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span>${member.hourly_rate}/hr</span>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                                    <div className="grid grid-cols-3 gap-2">
                                        <SmallStat label="Active" value={activeTasks.toString()} />
                                        <SmallStat label="Done" value={completedTasks.toString()} />
                                        <SmallStat label="Rate" value={`${completionRate}%`} />
                                    </div>
                                    {memberTasks.length > 0 && (
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-emerald-600 transition-all duration-500 ease-out"
                                                style={{ width: `${completionRate}%` }}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" />
                                        {(member as any).created_at ? new Date((member as any).created_at).toLocaleDateString() : "—"}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${getWorkloadColor(activeTasks) === "bg-slate-300 dark:bg-slate-600"
                                        ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                        : getWorkloadColor(activeTasks) === "bg-emerald-500"
                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                            : getWorkloadColor(activeTasks) === "bg-amber-500"
                                                ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                                : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                        }`}>
                                        {getWorkloadLabel(activeTasks)}
                                    </span>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

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

function KpiCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
            <p className={`text-2xl md:text-[26px] font-bold leading-tight mt-1 ${accent ? "text-emerald-700 dark:text-emerald-300" : "text-slate-900 dark:text-white"}`}>{value}</p>
        </div>
    )
}

function SmallStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="text-center rounded-md bg-slate-50 dark:bg-slate-800/40 py-2">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">{label}</p>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{value}</p>
        </div>
    )
}
