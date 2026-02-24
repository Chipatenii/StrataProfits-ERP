"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Folder, Users, CheckCircle, ArrowRight, Loader2, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CreateProjectModal } from "./create-project-modal"
import { Project } from "@/lib/types"

interface ProjectListViewProps {
    userId?: string
    onSelectProject?: (projectId: string) => void
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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <p className="text-muted-foreground">Loading projects...</p>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Premium Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-8 md:p-10 text-white shadow-2xl shadow-blue-500/30">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Briefcase className="w-5 h-5 text-blue-200" />
                            <span className="text-sm font-medium text-blue-100 uppercase tracking-wider">Portfolio</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">Projects</h1>
                        <p className="text-blue-100/80 text-lg">Manage your agency projects and track progress</p>
                    </div>
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-white text-blue-600 hover:bg-blue-50 hover:shadow-lg transition-all duration-200 shadow-md font-bold text-base px-6 py-5 rounded-xl border-none"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        New Project
                    </Button>
                </div>

                {/* Quick Stats in Hero */}
                <div className="relative z-10 grid grid-cols-3 gap-4 mt-8 md:w-3/4 lg:w-1/2">
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center">
                        <p className="text-3xl font-bold">{projects.length}</p>
                        <p className="text-sm text-blue-100/80">Total Projects</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center">
                        <p className="text-3xl font-bold">{projects.filter(p => p.status === 'active').length}</p>
                        <p className="text-sm text-blue-100/80">Active</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center">
                        <p className="text-3xl font-bold">{projects.filter(p => p.status === 'completed').length}</p>
                        <p className="text-sm text-blue-100/80">Completed</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.length === 0 ? (
                    <div className="col-span-full text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-xl shadow-black/5 dark:shadow-black/20">
                        <Folder className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground">No projects yet</h3>
                        <p className="text-muted-foreground mb-6">Create your first project to get started.</p>
                        <Button variant="outline" onClick={() => setShowCreateModal(true)} className="rounded-xl px-6">
                            Create Project
                        </Button>
                    </div>
                ) : (
                    projects.map((project) => (
                        <div
                            key={project.id}
                            onClick={() => {
                                if (onSelectProject) {
                                    onSelectProject(project.id)
                                } else {
                                    router.push(`/projects/${project.id}`)
                                }
                            }}
                            className="group block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800 shadow-lg shadow-black/5 dark:shadow-black/20 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 p-6 cursor-pointer relative overflow-hidden"
                        >
                            {/* Accent Bar */}
                            <div className={`absolute top-0 left-0 right-0 h-1.5 ${project.status === 'active' ? 'bg-gradient-to-r from-emerald-500 to-green-500' :
                                    project.status === 'completed' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                                        'bg-gradient-to-r from-gray-400 to-gray-500'
                                }`} />

                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pt-2">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 text-blue-600 dark:text-blue-400">
                                    <Folder className="w-6 h-6" />
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide w-fit ${project.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' :
                                        project.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                    }`}>
                                    {project.status}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold mb-2 text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {project.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-6 line-clamp-2 min-h-[40px] leading-relaxed">
                                {project.description || "No description provided."}
                            </p>

                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1.5 rounded-lg">
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                    <span className="font-medium">{project.tasks?.[0]?.count || 0} Tasks</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1.5 rounded-lg">
                                    <Users className="w-4 h-4 text-blue-500" />
                                    <span className="font-medium">{project.members?.[0]?.count || 0} Members</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm">
                                <span className="text-muted-foreground text-xs">
                                    Created {new Date(project.created_at).toLocaleDateString()}
                                </span>
                                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold text-xs group-hover:translate-x-1 transition-transform">
                                    View Details <ArrowRight className="w-3.5 h-3.5" />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <CreateProjectModal
                open={showCreateModal}
                onOpenChange={setShowCreateModal}
                onSuccess={loadProjects}
            />
        </div>
    )
}
