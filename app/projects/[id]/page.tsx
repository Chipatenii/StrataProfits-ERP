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

    // Allow admin, virtual_assistant, and book_keeper roles full access
    const isPrivilegedRole = profile?.role === "admin" || profile?.role === "virtual_assistant" || profile?.role === "book_keeper"

    if (!isPrivilegedRole) {
        // Check if user is a member of this specific project
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
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold">{APP_NAME}</h1>
                    <div className="flex items-center gap-4">
                        <a href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900">Dashboard</a>
                        <span className="text-gray-300">/</span>
                        <a href="/projects" className="text-sm font-medium text-gray-600 hover:text-gray-900">Projects</a>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-6 py-8">
                <ProjectDetailView projectId={id} />
            </main>
        </div>
    )
}
