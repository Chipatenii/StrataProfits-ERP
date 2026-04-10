import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const admin = await createAdminClient()
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()

        if (profile?.role !== "admin") {
            return NextResponse.json({ error: "Forbidden (Admin only)" }, { status: 403 })
        }

        // Fetch members
        const { data: members, error: mErr } = await admin.from("profiles").select("id, full_name, role")
        if (mErr) throw mErr

        // Fetch tasks
        const { data: tasks, error: tErr } = await admin.from("tasks").select("*")
        if (tErr) throw tErr

        // Calculate Efficiency per user
        // We only care about COMPLETED or VERIFIED tasks that have an `estimated_hours`
        const userEfficiency = members.map(m => {
            const memberTasks = tasks.filter(t => t.assigned_to === m.id && (t.status === "completed" || t.status === "verified") && t.estimated_hours && t.time_allocated != null)
            
            let totalEstimated = 0
            let totalActual = 0

            memberTasks.forEach(task => {
                totalEstimated += (task.estimated_hours || 0)
                totalActual += (task.time_allocated || 0)
            })

            let efficiencyRatio = 1
            if (totalActual > 0) {
                efficiencyRatio = totalEstimated / totalActual
            } else if (totalEstimated > 0) {
                efficiencyRatio = 2 // Extremely efficient if they somehow took 0 time
            } else {
                efficiencyRatio = 0
            }

            return {
                id: m.id,
                name: m.full_name,
                completedCount: memberTasks.length,
                totalEstimated,
                totalActual,
                efficiencyRatio, // > 1 is good (under estimate), < 1 is bad (over estimate)
                tasks: memberTasks.map(t => ({
                    id: t.id,
                    title: t.title,
                    estimated: t.estimated_hours,
                    actual: t.time_allocated
                }))
            }
        }).filter(u => u.completedCount > 0).sort((a, b) => b.efficiencyRatio - a.efficiencyRatio) // sort by most efficient

        // Aging Tasks (in_progress for more than 5 days)
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        const agingTasks = tasks.filter(t => 
            t.status === "in_progress" && 
            t.updated_at && 
            new Date(t.updated_at) < fiveDaysAgo
        ).map(t => ({
            id: t.id,
            title: t.title,
            assignedTo: members.find(m => m.id === t.assigned_to)?.full_name || "Unassigned",
            updatedAt: t.updated_at,
            daysAging: Math.floor((new Date().getTime() - new Date(t.updated_at).getTime()) / (1000 * 3600 * 24))
        })).sort((a, b) => b.daysAging - a.daysAging)

        return NextResponse.json({
            userEfficiency,
            agingTasks
        })

    } catch (error) {
        console.error("Error fetching performance stats:", error)
        return NextResponse.json({ error: "Failed to fetch performance stats" }, { status: 500 })
    }
}
