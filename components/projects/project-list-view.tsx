"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Folder, Users, CheckCircle2, ArrowRight } from "lucide-react"
import { CreateProjectModal } from "./create-project-modal"
import { Project } from "@/lib/types"

interface ProjectListViewProps {
    userId?: string
    onSelectProject?: (projectId: string) => void
}

const STATUS_PILL: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
    completed: "bg-slate-50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
    on_hold: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    archived: "bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400",
}

export function ProjectListView({ onSelectProject }: ProjectListViewProps) {
    const router = useRouter()
    const [projects, setProjects] = useState<(Project & { tasks: { count: number }[], members: { count: number }[] })[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)

    const loadProjects = async () => {
        try {
            const response = await fetch("/api/admin/projects")
            if (response.ok) {
                const data = await response.json()
                setProjects(data)
            }
        } catch (error) {
            console.error("Failed to load projects:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadProjects()
    }, [])

    const activeCount = projects.filter(p => p.status === "active").length
    const completedCount = projects.filter(p => p.status === "completed").length

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading projects...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">Projects</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage projects and track progress</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" /> New Project
                </button>
            </div>

            {/* KPI strip */}
            <div className="grid gap-3 md:grid-cols-3">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total projects</p>
                    <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{projects.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Active</p>
                    <p className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-400">{activeCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Completed</p>
                    <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{completedCount}</p>
                </div>
            </div>

            {/* Project grid */}
            {projects.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Folder className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">No projects yet</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Create your first project to get started.</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Create Project
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            onClick={() => {
                                if (onSelectProject) {
                                    onSelectProject(project.id)
                                } else {
                                    router.push(`/projects/${project.id}`)
                                }
                            }}
                            className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-700 transition-colors p-5 cursor-pointer"
                        >
                            <div className="flex justify-between items-start gap-3 mb-4">
                                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                    <Folder className="w-4 h-4" />
                                </div>
                                <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md ${STATUS_PILL[project.status] || STATUS_PILL.archived}`}>
                                    {project.status}
                                </span>
                            </div>

                            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors truncate">
                                {project.name}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 min-h-[40px] leading-relaxed">
                                {project.description || "No description provided."}
                            </p>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-4">
                                <div className="inline-flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                                    <span className="font-medium">{project.tasks?.[0]?.count || 0} Tasks</span>
                                </div>
                                <div className="inline-flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="font-medium">{project.members?.[0]?.count || 0} Members</span>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Created {new Date(project.created_at).toLocaleDateString()}
                                </span>
                                <div className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold text-xs group-hover:translate-x-0.5 transition-transform">
                                    View <ArrowRight className="w-3 h-3" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <CreateProjectModal
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
                onSuccess={loadProjects}
            />
        </div>
    )
}
