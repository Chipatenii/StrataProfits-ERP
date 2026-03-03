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

    // Fetch the client's profile to get their specific client_id
    const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name, client_id")
        .eq("id", user.id)
        .single()

    if (profile?.role !== 'client' || !profile?.client_id) {
        // If an admin tries to hit this, we could conditionally allow it, but for now redirect them back
        redirect("/dashboard")
    }

    // Fetch the specific client company details to personalize the dash
    const { data: clientData } = await supabase
        .from("clients")
        .select("*")
        .eq("id", profile.client_id)
        .single()

    // Fetch active projects for this client
    const { data: projectsData } = await supabase
        .from("projects")
        .select("id, name, status, budget, timeline_start, timeline_end")
        .eq("client_id", profile.client_id)
        .order("created_at", { ascending: false })

    // Fetch outstanding invoices for this client
    const { data: invoicesData } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, currency, status, due_date")
        .eq("client_id", profile.client_id)
        .in("status", ["sent", "overdue"])

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <Header />
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in p-6 pt-10">
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 md:p-10 text-white shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-5 h-5 text-indigo-300" />
                        <span className="text-sm font-medium text-indigo-200 tracking-wider">Client Portal</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome back, {profile.full_name.split(' ')[0]}</h1>
                    <p className="text-indigo-200/80 text-lg">
                        Viewing dashboard for {clientData?.name || clientData?.business_name || 'your company'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Active Projects */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                            <h2 className="text-xl font-bold text-slate-800">Your Projects</h2>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        {(!projectsData || projectsData.length === 0) ? (
                            <p className="text-slate-500 text-center py-8">No active projects found.</p>
                        ) : (
                            projectsData.map(project => (
                                <div key={project.id} className="p-4 rounded-xl border border-slate-100 hover:border-indigo-100 bg-slate-50/50 hover:bg-indigo-50/30 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold text-slate-800">{project.name}</h3>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium 
                                            ${project.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                              project.status === 'active' ? 'bg-indigo-100 text-indigo-700' : 
                                              'bg-slate-100 text-slate-700'}`}>
                                            {project.status || 'Active'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                                        <div>
                                            <span className="text-slate-500 block mb-1">Timeline</span>
                                            <span className="font-medium text-slate-700">
                                                {project.timeline_start ? new Date(project.timeline_start).toLocaleDateString() : 'TBD'} - 
                                                {project.timeline_end ? new Date(project.timeline_end).toLocaleDateString() : 'TBD'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block mb-1">Budget</span>
                                            <span className="font-medium text-slate-700">
                                                ZMW {project.budget?.toLocaleString() || '0'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Outstanding Invoices */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-rose-600" />
                            <h2 className="text-xl font-bold text-slate-800">Outstanding Invoices</h2>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        {(!invoicesData || invoicesData.length === 0) ? (
                            <p className="text-slate-500 text-center py-8">No outstanding invoices. You're all caught up!</p>
                        ) : (
                            invoicesData.map(invoice => (
                                <div key={invoice.id} className="p-4 rounded-xl border border-rose-100 bg-rose-50/30 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                            {invoice.invoice_number}
                                            {invoice.status === 'overdue' && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-800 uppercase">Overdue</span>
                                            )}
                                        </h3>
                                        <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                                            <Clock className="w-4 h-4" />
                                            Due {new Date(invoice.due_date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-lg text-slate-800">
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
