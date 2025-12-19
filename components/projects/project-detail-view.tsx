"use client"

import { useEffect, useState } from "react"
import { Deliverable, Project, ProjectMember, Task, UserProfile } from "@/lib/types"
import { Loader2, ArrowLeft, Users, Calendar, CheckCircle, Trash2, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AddMemberModal } from "./add-member-modal"
import { CreateDeliverableModal } from "./create-deliverable-modal"
import { useRouter } from "next/navigation"

import { APP_CONFIG } from "@/lib/config"

interface ProjectDetail extends Project {
    members: (ProjectMember & { profile: UserProfile })[]
    tasks: Task[]
    deliverables?: (Deliverable & { tasks: Task[] })[]
}

export function ProjectDetailView({ projectId, onBack }: { projectId: string; onBack?: () => void }) {
    const router = useRouter()
    const [project, setProject] = useState<ProjectDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [showAddMember, setShowAddMember] = useState(false)
    const [showAddDeliverable, setShowAddDeliverable] = useState(false)
    const [activeTab, setActiveTab] = useState<"tasks" | "members" | "deliverables">("tasks")

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

            // Also update deliverable status locally/db
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

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>
    if (!project) return <div className="p-12 text-center">Project not found</div>

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
                <div className="flex items-start md:items-center gap-4 w-full md:w-auto">
                    {onBack ? (
                        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full mt-1 md:mt-0">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    ) : (
                        <Link href="/projects" className="p-2 hover:bg-gray-100 rounded-full mt-1 md:mt-0">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    )}
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Stats Cards */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm col-span-1 md:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 text-gray-600">
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                            <span className="font-medium">Overall Progress</span>
                        </div>
                        <span className="text-sm font-bold text-blue-600">
                            {project.tasks.length > 0
                                ? Math.round((project.tasks.filter(t => t.status === 'completed').length / project.tasks.length) * 100)
                                : 0}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{
                                width: `${project.tasks.length > 0 ? (project.tasks.filter(t => t.status === 'completed').length / project.tasks.length) * 100 : 0}%`
                            }}
                        />
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                        <span>{project.tasks.filter(t => t.status === 'completed').length} of {project.tasks.length} tasks done</span>
                        <p>{project.tasks.filter(t => t.status !== 'completed').length} pending</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-gray-600">
                        <Users className="w-5 h-5 text-purple-600" />
                        <span className="font-medium">Team</span>
                    </div>
                    <p className="text-3xl font-bold">{project.members.length}</p>
                    <p className="text-sm text-gray-500 mt-1">Active contributors</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-gray-600">
                        <Calendar className="w-5 h-5 text-amber-600" />
                        <span className="font-medium">Created</span>
                    </div>
                    <p className="text-lg font-semibold">{new Date(project.created_at).toLocaleDateString()}</p>
                    <p className="text-sm text-gray-500 mt-1">Project inception</p>
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
                    {deliverablesEnabled && (
                        <button
                            onClick={() => setActiveTab("deliverables")}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'deliverables' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Deliverables
                        </button>
                    )}
                </div>

                {activeTab === "tasks" && !deliverablesEnabled && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-semibold">Project Tasks</h3>
                        </div>
                        {project.tasks.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No tasks in this project yet.</div>
                        ) : (
                            <div className="flex flex-col gap-0 md:block divide-y divide-gray-100 p-2 md:p-0">
                                {project.tasks.map(task => (
                                    <div key={task.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 gap-3 border rounded-lg md:border-0 md:rounded-none mb-2 md:mb-0 shadow-sm md:shadow-none bg-white">
                                        <div>
                                            <p className="font-medium text-base">{task.title}</p>
                                            <div className="flex gap-2 mt-2 md:mt-1">
                                                <span className={`text-xs px-2 py-0.5 rounded uppercase font-medium ${task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {task.status}
                                                </span>
                                                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600 uppercase font-medium">{task.priority}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "tasks" && deliverablesEnabled && (
                    <div className="space-y-6">
                        {(project.deliverables || []).map(deliverable => (
                            <div key={deliverable.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-blue-900">{deliverable.name}</h3>
                                        {deliverable.is_default && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">Default</span>}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="hidden sm:flex flex-col items-end gap-1">
                                            <div className="text-[10px] text-gray-400 uppercase font-bold">Progress</div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 bg-gray-200 rounded-full h-1.5">
                                                    <div
                                                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                                                        style={{
                                                            width: `${deliverable.tasks?.length > 0 ? (deliverable.tasks?.filter(t => t.status === 'completed').length / deliverable.tasks?.length) * 100 : 0}%`
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-gray-600">
                                                    {deliverable.tasks?.length > 0
                                                        ? Math.round((deliverable.tasks?.filter(t => t.status === 'completed').length / deliverable.tasks?.length) * 100)
                                                        : 0}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="flex items-center gap-2">
                                                {deliverable.approval_status === "approved" ? (
                                                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold uppercase">Approved</span>
                                                ) : deliverable.approval_status === "under_review" ? (
                                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase">In Review</span>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-[10px] text-blue-600 hover:text-blue-700 p-0 font-bold uppercase"
                                                        onClick={() => handleRequestDeliverableApproval(deliverable.id)}
                                                        disabled={deliverable.tasks?.length === 0 || deliverable.tasks?.some(t => t.status !== 'completed')}
                                                    >
                                                        Request Sign-off
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">{deliverable.status}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-0 md:block divide-y divide-gray-100 p-2 md:p-0">
                                    {deliverable.tasks?.length === 0 ? (
                                        <div className="p-4 text-center text-gray-400 text-sm">No tasks assigned to this deliverable.</div>
                                    ) : (
                                        deliverable.tasks?.map(task => (
                                            <div key={task.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 gap-3 border rounded-lg md:border-0 md:rounded-none mb-2 md:mb-0 shadow-sm md:shadow-none bg-white">
                                                <div>
                                                    <p className="font-medium text-base">{task.title}</p>
                                                    <div className="flex gap-2 mt-2 md:mt-1">
                                                        <span className={`text-xs px-2 py-0.5 rounded uppercase font-medium ${task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                            {task.status}
                                                        </span>
                                                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600 uppercase font-medium">{task.priority}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={deliverable.id}
                                                        onChange={(e) => handleMoveTask(task.id, e.target.value)}
                                                        className="text-xs border rounded px-2 py-1 bg-white text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    >
                                                        <option value="" disabled>Move to...</option>
                                                        {(project.deliverables || []).map(d => (
                                                            <option key={d.id} value={d.id}>{d.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Unassigned Tasks Bucket */}
                        {project.tasks.filter(t => !t.deliverable_id).length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden border-dashed">
                                <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                                    <h3 className="font-semibold text-gray-500 italic">Unassigned Tasks</h3>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs text-gray-400 font-medium">
                                            {project.tasks.filter(t => !t.deliverable_id && t.status === 'completed').length} / {project.tasks.filter(t => !t.deliverable_id).length} done
                                        </span>
                                        <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Misc</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-0 md:block divide-y divide-gray-100 p-2 md:p-0">
                                    {project.tasks.filter(t => !t.deliverable_id).map(task => (
                                        <div key={task.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 gap-3 border rounded-lg md:border-0 md:rounded-none mb-2 md:mb-0 shadow-sm md:shadow-none bg-white">
                                            <div>
                                                <p className="font-medium text-base text-gray-600">{task.title}</p>
                                                <div className="flex gap-2 mt-2 md:mt-1">
                                                    <span className={`text-xs px-2 py-0.5 rounded uppercase font-medium ${task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {task.status}
                                                    </span>
                                                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600 uppercase font-medium">{task.priority}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    defaultValue=""
                                                    onChange={(e) => handleMoveTask(task.id, e.target.value)}
                                                    className="text-xs border rounded px-2 py-1 bg-white text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                >
                                                    <option value="" disabled>Assign to...</option>
                                                    {(project.deliverables || []).map(d => (
                                                        <option key={d.id} value={d.id}>{d.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "deliverables" && deliverablesEnabled && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h3 className="font-semibold">Project Deliverables</h3>
                            <Button size="sm" onClick={() => setShowAddDeliverable(true)} className="w-full sm:w-auto">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Deliverable
                            </Button>
                        </div>
                        <div className="flex flex-col gap-0 md:block divide-y divide-gray-100 p-2 md:p-0">
                            {(project.deliverables || []).map(deliverable => (
                                <div key={deliverable.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 gap-3 border rounded-lg md:border-0 md:rounded-none mb-2 md:mb-0 shadow-sm md:shadow-none bg-white">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium">{deliverable.name}</p>
                                            {deliverable.is_default && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase">Default</span>}
                                        </div>
                                        <p className="text-sm text-gray-500">{deliverable.description || "No description"}</p>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="text-[10px] text-gray-400 uppercase font-bold">Health</div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 bg-gray-100 rounded-full h-1">
                                                    <div
                                                        className="bg-blue-400 h-1 rounded-full"
                                                        style={{
                                                            width: `${deliverable.tasks?.length > 0 ? (deliverable.tasks?.filter(t => t.status === 'completed').length / deliverable.tasks?.length) * 100 : 0}%`
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-mono">
                                                    {deliverable.tasks?.filter(t => t.status === 'completed').length}/{deliverable.tasks?.length}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-400 font-bold uppercase">Shared</span>
                                                <button
                                                    onClick={() => toggleDeliverableShared(deliverable.id, deliverable.is_shared)}
                                                    className={`w-8 h-4 rounded-full transition-colors relative ${deliverable.is_shared ? 'bg-blue-600' : 'bg-gray-200'}`}
                                                >
                                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${deliverable.is_shared ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 uppercase">
                                                    {deliverable.approval_status || deliverable.status}
                                                </span>
                                                {!deliverable.is_default && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteDeliverable(deliverable.id)}
                                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === "members" && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h3 className="font-semibold">Project Team</h3>
                            <Button size="sm" onClick={() => setShowAddMember(true)} className="w-full sm:w-auto">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Member
                            </Button>
                        </div>
                        {project.members.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No members added yet.</div>
                        ) : (
                            <div className="flex flex-col gap-0 md:block divide-y divide-gray-100 p-2 md:p-0">
                                {project.members.map(member => (
                                    <div key={member.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-gray-50 gap-3 border rounded-lg md:border-0 md:rounded-none mb-2 md:mb-0 shadow-sm md:shadow-none bg-white">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium shrink-0">
                                                {member.profile.full_name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium">{member.profile.full_name}</p>
                                                <p className="text-sm text-gray-500">{member.profile.role}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0">
                                            <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded text-gray-600 uppercase">{member.role}</span>
                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteMember(member.user_id)} className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50">
                                                <Trash2 className="w-4 h-4" />
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

            <CreateDeliverableModal
                projectId={projectId}
                open={showAddDeliverable}
                onOpenChange={setShowAddDeliverable}
                onSuccess={loadProject}
            />
        </div>
    )
}
