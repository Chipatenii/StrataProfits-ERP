import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProjectListView } from "@/components/projects/project-list-view"

// For now, consistent header is good. I'll stick to a simple page structure.

export default async function ProjectsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/auth/login")
    }

    // Check role
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
        // Redirect non-admins back to dashboard (or show only their projects?)
        // Requirement said "Admin view: Projects list".
        // "Team view: Tasks grouped or filtered by project".
        // So for now, restrict full project list to admins? 
        // Plan: "Admins have full access... Team Members can only view projects they are assigned to"
        // I will allow Team Members to see this page but filtered?
        // Implementation Plan said "Frontend (Admin): Create Project List page". 
        // I'll restrict to admin for this specific route for now to match the plan, 
        // and Team Members will see projects in their Dashboard via filters.
        redirect("/dashboard")
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold">Ostento Tracker</h1>
                    <div className="flex items-center gap-4">
                        {/* Simplified header for sub-page */}
                        <a href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900">Back to Dashboard</a>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-6 py-8">
                <ProjectListView />
            </main>
        </div>
    )
}
