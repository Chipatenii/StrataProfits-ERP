import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProjectListView } from "@/components/projects/project-list-view"
import { APP_NAME } from "@/lib/config"

export default async function ProjectsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/auth/login")
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
        redirect("/dashboard")
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{APP_NAME}</h1>
                    <div className="flex items-center gap-4">
                        <a href="/dashboard" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-700">
                            Back to Dashboard
                        </a>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-6 py-8">
                <ProjectListView />
            </main>
        </div>
    )
}
