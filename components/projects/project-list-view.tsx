"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Folder, Calendar, Users, CheckCircle, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CreateProjectModal } from "./create-project-modal"
import { Project } from "@/lib/types"

interface ProjectListViewProps {
    userId?: string
}

export function ProjectListView({ userId }: ProjectListViewProps) {
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
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Projects</h1>
                    <p className="text-muted-foreground">Manage your agency projects and track progress.</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                        <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">No projects yet</h3>
                        <p className="text-gray-500 mb-4">Create your first project to get started.</p>
                        <Button variant="outline" onClick={() => setShowCreateModal(true)}>
                            Create Project
                        </Button>
                    </div>
                ) : (
                    projects.map((project) => (
                        <Link
                            key={project.id}
                            href={`/projects/${project.id}`}
                            className="group block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-6"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                                    <Folder className="w-6 h-6 text-blue-600" />
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${project.status === 'active' ? 'bg-green-100 text-green-700' :
                                    project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                                </span>
                            </div>

                            <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-600 transition-colors">
                                {project.name}
                            </h3>
                            <p className="text-sm text-gray-500 mb-4 line-clamp-2 min-h-[40px]">
                                {project.description || "No description provided."}
                            </p>

                            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle className="w-4 h-4" />
                                    <span>{project.tasks?.[0]?.count || 0} Tasks</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Users className="w-4 h-4" />
                                    <span>{project.members?.[0]?.count || 0} Members</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                                <span className="text-gray-400">
                                    Created {new Date(project.created_at).toLocaleDateString()}
                                </span>
                                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                            </div>
                        </Link>
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
