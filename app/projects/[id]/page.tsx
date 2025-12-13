import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProjectDetailView } from "@/components/projects/project-detail-view"

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/auth/login")
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    // Ideally allow members to view if they are in the project
    // But for now, stick to Admin access for this "management" view as per plan
    if (profile?.role !== "admin" && profile?.role !== "virtual_assistant" && profile?.role !== "book_keeper") {
        // TODO: Check if member is in project_members, if so allow?
        // For now allowing core roles
        redirect("/dashboard")
    }

    const { id } = await params

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold">Ostento Tracker</h1>
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
