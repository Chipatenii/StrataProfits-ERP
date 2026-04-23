import { APP_NAME } from "@/lib/config"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProjectDetailView } from "@/components/projects/project-detail-view"

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()
    const { id } = await params

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/auth/login")
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    const isPrivilegedRole = profile?.role === "admin" || profile?.role === "virtual_assistant" || profile?.role === "book_keeper"

    if (!isPrivilegedRole) {
        const { data: projectMember } = await supabase
            .from("project_members")
            .select("id")
            .eq("project_id", id)
            .eq("user_id", user.id)
            .single()

        if (!projectMember) {
            redirect("/dashboard")
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{APP_NAME}</h1>
                    <div className="flex items-center gap-3 text-sm">
                        <a href="/dashboard" className="font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-700">Dashboard</a>
                        <span className="text-slate-300 dark:text-slate-700">/</span>
                        <a href="/projects" className="font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-700">Projects</a>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-6 py-8">
                <ProjectDetailView projectId={id} />
            </main>
        </div>
    )
}
