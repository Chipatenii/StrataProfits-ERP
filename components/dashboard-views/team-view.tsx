"use client"

import { Users, Mail, Phone, Clock, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TeamViewProps {
    members: any[]
    tasks: any[]
    onEditMember?: (member: any) => void
    onDeleteMember?: (memberId: string) => void
    currentUserId?: string
}

export function TeamView({ members, tasks, onEditMember, onDeleteMember }: TeamViewProps) {
    return (
        <div className="space-y-8 animate-fade-in">
            {/* Premium Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-8 md:p-10 text-white shadow-2xl shadow-purple-500/30">
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

                {/* Quick Stats in Hero */}
                <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center">
                        <p className="text-3xl font-bold">{members.length}</p>
                        <p className="text-sm text-violet-100/80">Total Members</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center">
                        <p className="text-3xl font-bold">{members.filter(m => m.role === 'admin').length}</p>
                        <p className="text-sm text-violet-100/80">Admins</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center">
                        <p className="text-3xl font-bold">{members.filter(m => ['va', 'virtual_assistant'].includes(m.role?.toLowerCase())).length}</p>
                        <p className="text-sm text-violet-100/80">VAs</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center">
                        <p className="text-3xl font-bold">{members.filter(m => m.role === 'marketing').length}</p>
                        <p className="text-sm text-violet-100/80">Marketing</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {members.length === 0 ? (
                    <div className="col-span-full text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-xl shadow-black/5 dark:shadow-black/20">
                        <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground">No team members found</h3>
                        <p className="text-muted-foreground">Invite members to grow your team.</p>
                    </div>
                ) : (
                    members.map((member) => {
                        const memberTasks = tasks.filter((t) => t.assigned_to === member.id)
                        const activeTasks = memberTasks.filter(t => t.status !== 'completed').length
                        const completedTasks = memberTasks.filter(t => t.status === 'completed').length

                        return (
                            <div key={member.id} className="group bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                                {/* Top Accent */}
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500" />

                                <div className="flex items-start justify-between mb-6 pt-2">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-xl font-bold text-slate-600 dark:text-slate-300 shadow-inner">
                                            {member.full_name?.charAt(0) || "?"}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-foreground leading-tight">{member.full_name}</h3>
                                            <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider mt-1 ${member.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' :
                                                ['va', 'virtual_assistant'].includes(member.role?.toLowerCase()) ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                                                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                                                }`}>
                                                {member.role?.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        {onEditMember && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onEditMember(member)}
                                                className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                                                title="Edit member"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                        )}
                                        {onDeleteMember && member.role !== 'admin' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onDeleteMember(member.id)}
                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                                                title="Delete member"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                                        <Mail className="w-4 h-4 text-violet-500 shrink-0" />
                                        <span className="truncate">{member.email}</span>
                                    </div>
                                    {member.phone && (
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                                            <Phone className="w-4 h-4 text-violet-500 shrink-0" />
                                            <span>{member.phone}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                                    <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Active Tasks</p>
                                        <p className="text-lg font-bold text-foreground">{activeTasks}</p>
                                    </div>
                                    <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Completed</p>
                                        <p className="text-lg font-bold text-foreground">{completedTasks}</p>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        Joined {member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
