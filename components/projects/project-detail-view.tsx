"use client"

import { useEffect, useState } from "react"
import { Deliverable, Project, ProjectMember, Task, UserProfile } from "@/lib/types"
import { ArrowLeft, Users, Calendar, CheckCircle2, Trash2, Plus } from "lucide-react"
import { getRoleBadgeStyles, formatRoleName } from "@/lib/utils/role-styles"
import Link from "next/link"
import { AddMemberModal } from "./add-member-modal"
import { CreateDeliverableModal } from "./create-deliverable-modal"
import { TaskDetailModal } from "@/components/modals/task-detail-modal"
import { useRouter } from "next/navigation"
import { CommentsSection } from "@/components/ui/comments-section"

import { APP_CONFIG } from "@/lib/config"

interface ProjectDetail extends Project {
    members: (ProjectMember & { profile: UserProfile })[]
    tasks: Task[]
    deliverables?: (Deliverable & { tasks: Task[] })[]
}

const STATUS_PILL: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    completed: "bg-slate-50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
    on_hold: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    archived: "bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400",
}

const TASK_STATUS_PILL: Record<string, string> = {
    completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    verified: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    in_progress: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    pending_approval: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    blocked: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400",
}

const pill = (status: string) => TASK_STATUS_PILL[status] || "bg-slate-50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300"

export function ProjectDetailView({ projectId, onBack }: { projectId: string; onBack?: () => void }) {
    const router = useRouter()
    const [project, setProject] = useState<ProjectDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [showAddMember, setShowAddMember] = useState(false)
    const [showAddDeliverable, setShowAddDeliverable] = useState(false)
    const [activeTab, setActiveTab] = useState<"tasks" | "members" | "deliverables" | "comments">("tasks")
    const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(null)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

    const handleCardClick = (task: Task) => {
        setSelectedTaskDetail(task)
        setIsDetailModalOpen(true)
    }

    const deliverablesEnabled = APP_CONFIG.features.ff_deliverables_enabled

    const loadProject = async () => {
        try {
            const response = await fetch(`/api/admin/projects/${projectId}`)
            if (response.ok) {
                const data = await response.json()
                setProject(data)
            } else {
                console.error("Failed to load project")
            }
        } catch (error) {
            console.error("Error loading project:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadProject()
    }, [projectId])

    const handleDeleteMember = async (userId: string) => {
        if (!confirm("Remove this member from the project?")) return

        try {
            await fetch(`/api/admin/projects/${projectId}/members?userId=${userId}`, {
                method: "DELETE"
            })
            loadProject()
        } catch (error) {
            console.error("Failed to delete member", error)
        }
    }

    const handleDeleteProject = async () => {
        if (!confirm("Are you sure? This will delete the project.")) return

        try {
            await fetch(`/api/admin/projects/${projectId}`, { method: "DELETE" })
            if (onBack) {
                onBack()
            } else {
                router.push("/projects")
            }
        } catch (error) {
            console.error("Failed to delete project", error)
        }
    }

    const handleDeleteDeliverable = async (deliverableId: string) => {
        if (!confirm("Delete this deliverable? Tasks will be reassigned to the default deliverable.")) return

        try {
            const response = await fetch(`/api/admin/deliverables?id=${deliverableId}`, {
                method: "DELETE"
            })
            if (!response.ok) {
                const data = await response.json()
                alert(data.error || "Failed to delete deliverable")
                return
            }
            loadProject()
        } catch (error) {
            console.error("Failed to delete deliverable", error)
        }
    }

    const handleMoveTask = async (taskId: string, deliverableId: string | null) => {
        try {
            const response = await fetch(`/api/admin/tasks?id=${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deliverable_id: deliverableId })
            })
            if (!response.ok) throw new Error("Failed to move task")
            loadProject()
        } catch (error) {
            console.error("Error moving task:", error)
        }
    }

    const handleRequestDeliverableApproval = async (deliverableId: string) => {
        try {
            const response = await fetch(`/api/approvals`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    entity_type: "deliverable",
                    entity_id: deliverableId,
                    assigned_role: "admin"
                })
            })
            if (!response.ok) throw new Error("Failed to request approval")

            await fetch(`/api/admin/deliverables?id=${deliverableId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ approval_status: "under_review" })
            })

            loadProject()
        } catch (error) {
            console.error("Error requesting approval:", error)
        }
    }

    const toggleDeliverableShared = async (deliverableId: string, currentShared: boolean) => {
        try {
            const response = await fetch(`/api/admin/deliverables?id=${deliverableId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_shared: !currentShared })
            })
            if (response.ok) loadProject()
        } catch (error) {
            console.error("Error toggling shared status:", error)
        }
    }

    const handleBillDeliverable = async (deliverable: Deliverable) => {
        if (!confirm(`Generate an invoice for "${deliverable.name}"? (Price: ZMW ${deliverable.total_price})`)) return

        try {
            const response = await fetch(`/api/admin/deliverables/bill`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deliverable_id: deliverable.id })
            })

            if (!response.ok) {
                const data = await response.json()
                alert(data.error || "Failed to generate invoice")
                return
            }

            const data = await response.json()
            alert(`Invoice ${data.invoiceId} generated successfully!`)
            loadProject()
        } catch (error) {
            console.error("Error billing deliverable:", error)
            alert("An error occurred while generating the invoice.")
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading project...</p>
            </div>
        )
    }

    if (!project) return <div className="p-12 text-center text-slate-500 dark:text-slate-400">Project not found</div>

    const completedCount = project.tasks.filter(t => t.status === "completed" || t.status === "verified").length
    const progress = project.tasks.length > 0 ? Math.round((completedCount / project.tasks.length) * 100) : 0
    const pendingCount = project.tasks.length - completedCount

    const tabButton = (tab: typeof activeTab, label: string) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab
                ? "bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
        >
            {label}
        </button>
    )

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page header */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 justify-between">
                <div className="flex items-start gap-3 w-full md:w-auto">
                    {onBack ? (
                        <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">
                            <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        </button>
                    ) : (
                        <Link href="/projects" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors">
                            <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        </Link>
                    )}
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                            <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight truncate">{project.name}</h1>
                            <span className={`w-fit text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md ${STATUS_PILL[project.status] || STATUS_PILL.archived}`}>
                                {project.status}
                            </span>
                        </div>
                        {project.description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{project.description}</p>
                        )}
                    </div>
                </div>
                <button
                    onClick={handleDeleteProject}
                    className="inline-flex items-center gap-2 px-3 py-1.5 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-sm font-semibold rounded-md transition-colors"
                >
                    <Trash2 className="w-4 h-4" /> Delete Project
                </button>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 md:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                        <div className="inline-flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Overall progress</span>
                        </div>
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mb-2">
                        <div
                            className="bg-emerald-700 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>{completedCount} of {project.tasks.length} tasks done</span>
                        <span>{pendingCount} pending</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="inline-flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Team</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{project.members.length}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Active contributors</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="inline-flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Created</span>
                    </div>
                    <p className="text-base font-semibold text-slate-900 dark:text-white">{new Date(project.created_at).toLocaleDateString()}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Project inception</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="inline-flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg gap-1">
                {tabButton("tasks", "Tasks")}
                {tabButton("members", "Team")}
                {deliverablesEnabled && tabButton("deliverables", "Deliverables")}
                {tabButton("comments", "Comments")}
            </div>

            {activeTab === "tasks" && !deliverablesEnabled && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Project Tasks</h3>
                    </div>
                    {project.tasks.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No tasks in this project yet.</div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {project.tasks.map(task => (
                                <div
                                    key={task.id}
                                    onClick={() => handleCardClick(task)}
                                    className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 gap-3 cursor-pointer transition-colors"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{task.title}</p>
                                        <div className="flex gap-2 mt-1">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-md uppercase font-semibold ${pill(task.status)}`}>
                                                {task.status}
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 uppercase font-semibold">{task.priority}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === "tasks" && deliverablesEnabled && (
                <div className="space-y-3">
                    {(project.deliverables || []).map(deliverable => {
                        const dTotal = deliverable.tasks?.length || 0
                        const dDone = deliverable.tasks?.filter(t => t.status === "completed" || t.status === "verified").length || 0
                        const dProgress = dTotal > 0 ? Math.round((dDone / dTotal) * 100) : 0
                        return (
                            <div key={deliverable.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{deliverable.name}</h3>
                                        {deliverable.is_default && <span className="text-[10px] bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md font-semibold uppercase">Default</span>}
                                        <span className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 font-semibold">{deliverable.status}</span>
                                    </div>
                                    <div className="flex items-center gap-4 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                                                <div
                                                    className="bg-emerald-700 h-1.5 rounded-full transition-all"
                                                    style={{ width: `${dProgress}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{dProgress}%</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {deliverable.invoice_id ? (
                                                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md font-semibold uppercase">Billed</span>
                                            ) : deliverable.approval_status === "approved" ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md font-semibold uppercase">Approved</span>
                                                    <button
                                                        onClick={() => handleBillDeliverable(deliverable)}
                                                        className="text-[10px] px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-md uppercase transition-colors"
                                                    >
                                                        Bill Now
                                                    </button>
                                                </div>
                                            ) : deliverable.approval_status === "under_review" ? (
                                                <span className="text-[10px] bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md font-semibold uppercase">In Review</span>
                                            ) : (
                                                <button
                                                    onClick={() => handleRequestDeliverableApproval(deliverable.id)}
                                                    disabled={dTotal === 0 || deliverable.tasks?.some(t => t.status !== "completed" && t.status !== "verified")}
                                                    className="text-[10px] text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-semibold uppercase disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    Request Sign-off
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {dTotal === 0 ? (
                                        <div className="p-4 text-center text-sm text-slate-400 dark:text-slate-500">No tasks assigned to this deliverable.</div>
                                    ) : (
                                        deliverable.tasks.map(task => (
                                            <div
                                                key={task.id}
                                                onClick={() => handleCardClick(task)}
                                                className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 gap-3 cursor-pointer transition-colors"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{task.title}</p>
                                                    <div className="flex gap-2 mt-1">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-md uppercase font-semibold ${pill(task.status)}`}>
                                                            {task.status}
                                                        </span>
                                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 uppercase font-semibold">{task.priority}</span>
                                                    </div>
                                                </div>
                                                <select
                                                    value={deliverable.id}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => handleMoveTask(task.id, e.target.value)}
                                                    className="text-xs border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                >
                                                    <option value="" disabled>Move to...</option>
                                                    {(project.deliverables || []).map(d => (
                                                        <option key={d.id} value={d.id}>{d.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    {project.tasks.filter(t => !t.deliverable_id).length > 0 && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <h3 className="text-sm font-semibold italic text-slate-500 dark:text-slate-400">Unassigned Tasks</h3>
                                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                                    {project.tasks.filter(t => !t.deliverable_id && (t.status === "completed" || t.status === "verified")).length} / {project.tasks.filter(t => !t.deliverable_id).length} done
                                </span>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {project.tasks.filter(t => !t.deliverable_id).map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => handleCardClick(task)}
                                        className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 gap-3 cursor-pointer transition-colors"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-sm text-slate-600 dark:text-slate-300 truncate">{task.title}</p>
                                            <div className="flex gap-2 mt-1">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-md uppercase font-semibold ${pill(task.status)}`}>
                                                    {task.status}
                                                </span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 uppercase font-semibold">{task.priority}</span>
                                            </div>
                                        </div>
                                        <select
                                            defaultValue=""
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => handleMoveTask(task.id, e.target.value)}
                                            className="text-xs border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        >
                                            <option value="" disabled>Assign to...</option>
                                            {(project.deliverables || []).map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === "deliverables" && deliverablesEnabled && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Project Deliverables</h3>
                        <button
                            onClick={() => setShowAddDeliverable(true)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-md transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add Deliverable
                        </button>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(project.deliverables || []).map(deliverable => {
                            const dTotal = deliverable.tasks?.length || 0
                            const dDone = deliverable.tasks?.filter(t => t.status === "completed" || t.status === "verified").length || 0
                            const dProgress = dTotal > 0 ? (dDone / dTotal) * 100 : 0
                            return (
                                <div key={deliverable.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-medium text-sm text-slate-900 dark:text-white">{deliverable.name}</p>
                                            {deliverable.is_default && <span className="text-[10px] bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md font-semibold uppercase">Default</span>}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{deliverable.description || "No description"}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-20 bg-slate-100 dark:bg-slate-800 rounded-full h-1">
                                                <div
                                                    className="bg-emerald-700 h-1 rounded-full"
                                                    style={{ width: `${dProgress}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{dDone}/{dTotal}</span>
                                        </div>
                                        <div className="hidden sm:block text-right">
                                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">Value</div>
                                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
                                                {deliverable.billing_type === "fixed" ? `ZMW ${deliverable.total_price}` : "Hourly"}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">Shared</span>
                                            <button
                                                onClick={() => toggleDeliverableShared(deliverable.id, deliverable.is_shared)}
                                                className={`w-8 h-4 rounded-full transition-colors relative ${deliverable.is_shared ? "bg-emerald-700" : "bg-slate-200 dark:bg-slate-700"}`}
                                            >
                                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${deliverable.is_shared ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                                            </button>
                                        </div>
                                        <span className="text-[10px] font-mono bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-md text-slate-600 dark:text-slate-400 uppercase">
                                            {deliverable.approval_status || deliverable.status}
                                        </span>
                                        {!deliverable.is_default && (
                                            <button
                                                onClick={() => handleDeleteDeliverable(deliverable.id)}
                                                className="p-1.5 rounded-md text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {activeTab === "members" && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Project Team</h3>
                        <button
                            onClick={() => setShowAddMember(true)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-md transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add Member
                        </button>
                    </div>
                    {project.members.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No members added yet.</div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {project.members.map(member => (
                                <div key={member.id} className="p-4 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-semibold flex items-center justify-center shrink-0">
                                            {member.profile.full_name.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm text-slate-900 dark:text-white truncate">{member.profile.full_name}</p>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-md uppercase font-semibold ${getRoleBadgeStyles(member.profile.role).badge}`}>
                                                {formatRoleName(member.profile.role)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-[10px] font-semibold bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-md uppercase">{member.role}</span>
                                        <button
                                            onClick={() => handleDeleteMember(member.user_id)}
                                            className="p-1.5 rounded-md text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === "comments" && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 max-w-3xl">
                    <CommentsSection entityType="project" entityId={projectId} />
                </div>
            )}

            <AddMemberModal
                projectId={projectId}
                open={showAddMember}
                onOpenChange={setShowAddMember}
                onSuccess={loadProject}
            />

            <CreateDeliverableModal
                projectId={projectId}
                open={showAddDeliverable}
                onOpenChange={setShowAddDeliverable}
                onSuccess={loadProject}
            />

            <TaskDetailModal
                open={isDetailModalOpen}
                task={selectedTaskDetail}
                members={project.members.map(m => m.profile)}
                onOpenChange={setIsDetailModalOpen}
            />
        </div>
    )
}
