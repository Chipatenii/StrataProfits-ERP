"use client"

import { useEffect, useState } from "react"
import { Project, ProjectMember, Task, UserProfile } from "@/lib/types"
import { Loader2, ArrowLeft, Users, Calendar, CheckCircle, Trash2, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AddMemberModal } from "./add-member-modal"
import { useRouter } from "next/navigation"

interface ProjectDetail extends Project {
    members: (ProjectMember & { profile: UserProfile })[]
    tasks: Task[]
}

export function ProjectDetailView({ projectId }: { projectId: string }) {
    const router = useRouter()
    const [project, setProject] = useState<ProjectDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [showAddMember, setShowAddMember] = useState(false)
    const [activeTab, setActiveTab] = useState<"tasks" | "members">("tasks")

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
            router.push("/projects")
        } catch (error) {
            console.error("Failed to delete project", error)
        }
    }

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
    if (!project) return <div className="p-12 text-center">Project not found</div>

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
                <div className="flex items-start md:items-center gap-4 w-full md:w-auto">
                    <Link href="/projects" className="p-2 hover:bg-gray-100 rounded-full mt-1 md:mt-0">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                            <h1 className="text-2xl md:text-3xl font-bold">{project.name}</h1>
                            <span className={`w-fit px-2.5 py-0.5 rounded-full text-sm font-medium ${project.status === 'active' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                                }`}>
                                {project.status}
                            </span>
                        </div>
                        <p className="text-gray-500 mt-1">{project.description}</p>
                    </div>
                </div>
                <Button variant="outline" onClick={handleDeleteProject} className="w-full md:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 mt-4 md:mt-0">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Project
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats Cards */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-gray-600">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">Tasks</span>
                    </div>
                    <p className="text-3xl font-bold">{project.tasks.length}</p>
                    <p className="text-sm text-gray-500 mt-1">
                        {project.tasks.filter(t => t.status === 'completed').length} completed
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-gray-600">
                        <Users className="w-5 h-5 text-purple-600" />
                        <span className="font-medium">Team</span>
                    </div>
                    <p className="text-3xl font-bold">{project.members.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-gray-600">
                        <Calendar className="w-5 h-5 text-amber-600" />
                        <span className="font-medium">Created</span>
                    </div>
                    <p className="text-lg font-semibold">{new Date(project.created_at).toLocaleDateString()}</p>
                </div>
            </div>

            <div>
                <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-fit mb-6">
                    <button
                        onClick={() => setActiveTab("tasks")}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'tasks' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Tasks
                    </button>
                    <button
                        onClick={() => setActiveTab("members")}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'members' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Team Members
                    </button>
                </div>

                {activeTab === "tasks" && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-semibold">Project Tasks</h3>
                        </div>
                        {project.tasks.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No tasks in this project yet.</div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {project.tasks.map(task => (
                                    <div key={task.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 gap-2">
                                        <div>
                                            <p className="font-medium">{task.title}</p>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600 uppercase">{task.status}</span>
                                                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600 uppercase">{task.priority}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "members" && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-semibold">Project Team</h3>
                            <Button size="sm" onClick={() => setShowAddMember(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Member
                            </Button>
                        </div>
                        {project.members.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No members added yet.</div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {project.members.map(member => (
                                    <div key={member.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium">
                                                {member.profile.full_name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium">{member.profile.full_name}</p>
                                                <p className="text-sm text-gray-500">{member.profile.role}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto border-t md:border-t-0 pt-2 md:pt-0 mt-2 md:mt-0">
                                            <span className="text-sm text-gray-500 uppercase">{member.role}</span>
                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteMember(member.user_id)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <AddMemberModal
                projectId={projectId}
                open={showAddMember}
                onOpenChange={setShowAddMember}
                onSuccess={loadProject}
            />
        </div>
    )
}
