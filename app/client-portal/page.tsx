import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Building2, FileText, CheckCircle2, Clock } from "lucide-react"
import { Header } from "@/components/header"

export default async function ClientPortalPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/auth/login")
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name, client_id")
        .eq("id", user.id)
        .single()

    if (profile?.role !== 'client' || !profile?.client_id) {
        redirect("/dashboard")
    }

    const { data: clientData } = await supabase
        .from("clients")
        .select("*")
        .eq("id", profile.client_id)
        .single()

    const { data: projectsData } = await supabase
        .from("projects")
        .select("id, name, status, budget, timeline_start, timeline_end")
        .eq("client_id", profile.client_id)
        .order("created_at", { ascending: false })

    const { data: invoicesData } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, currency, status, due_date")
        .eq("client_id", profile.client_id)
        .in("status", ["sent", "overdue"])

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <Header />
            <div className="max-w-7xl mx-auto space-y-6 p-6 pt-10">
                {/* Page header */}
                <div className="flex items-start justify-between gap-4 pb-2">
                    <div>
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                            <Building2 className="w-3.5 h-3.5" />
                            Client Portal
                        </div>
                        <h1 className="mt-1 text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">
                            Welcome back, {profile.full_name.split(' ')[0]}
                        </h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Viewing dashboard for {clientData?.name || clientData?.business_name || 'your company'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Active Projects */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Your Projects</h2>
                        </div>
                        <div className="p-5 space-y-3">
                            {(!projectsData || projectsData.length === 0) ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No active projects found.</p>
                            ) : (
                                projectsData.map(project => {
                                    const status = (project.status || 'active').toLowerCase()
                                    const statusCls =
                                        status === 'completed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                                        status === 'active' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                                        'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                                    return (
                                        <div key={project.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{project.name}</h3>
                                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusCls}`}>
                                                    {project.status || 'Active'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 block mb-0.5">Timeline</span>
                                                    <span className="text-slate-700 dark:text-slate-300">
                                                        {project.timeline_start ? new Date(project.timeline_start).toLocaleDateString() : 'TBD'} —{' '}
                                                        {project.timeline_end ? new Date(project.timeline_end).toLocaleDateString() : 'TBD'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 block mb-0.5">Budget</span>
                                                    <span className="font-mono text-slate-900 dark:text-white">
                                                        ZMW {project.budget?.toLocaleString() || '0'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    {/* Outstanding Invoices */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-rose-600" />
                            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Outstanding Invoices</h2>
                        </div>
                        <div className="p-5 space-y-3">
                            {(!invoicesData || invoicesData.length === 0) ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No outstanding invoices. You&apos;re all caught up.</p>
                            ) : (
                                invoicesData.map(invoice => (
                                    <div key={invoice.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center">
                                        <div>
                                            <h3 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                                {invoice.invoice_number}
                                                {invoice.status === 'overdue' && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 uppercase tracking-wide">Overdue</span>
                                                )}
                                            </h3>
                                            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                Due {new Date(invoice.due_date).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono font-semibold text-slate-900 dark:text-white">
                                                {invoice.currency} {invoice.amount?.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
