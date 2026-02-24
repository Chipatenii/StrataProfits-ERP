import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic" // Prevent caching

export async function GET() {
  try {
    const admin = await createAdminClient()

    // Fetch all profiles
    const { data: members, error: membersError } = await admin.from("profiles").select("id, full_name, hourly_rate")

    if (membersError) throw membersError

    // Fetch all completed tasks
    const { data: tasks, error: tasksError } = await admin
      .from("tasks")
      .select("assigned_to, status")
      .eq("status", "completed")

    if (tasksError) throw tasksError

    // Fetch all time logs for calculation
    const { data: logs, error: logsError } = await admin.from("time_logs").select("user_id, duration_minutes")

    if (logsError) throw logsError

    // Calculate stats
    const leaderboard = members.map((member) => {
      const completedTasks = tasks.filter((t) => t.assigned_to === member.id).length

      const memberLogs = logs.filter((l) => l.user_id === member.id)
      const totalMinutes = memberLogs.reduce((acc, log) => acc + (log.duration_minutes || 0), 0)
      const totalHours = totalMinutes / 60
      const totalEarnings = totalHours * (member.hourly_rate || 0)

      return {
        id: member.id,
        name: member.full_name,
        completedTasks,
        totalHours: Number.parseFloat(totalHours.toFixed(1)),
        totalEarnings: Number.parseFloat(totalEarnings.toFixed(2)),
      }
    })

    // Sort by earnings (descending)
    leaderboard.sort((a, b) => b.totalEarnings - a.totalEarnings)

    const bestPerformer =
      leaderboard.filter((member) => member.totalEarnings > 0).length > 0
        ? leaderboard.filter((member) => member.totalEarnings > 0)[0]
        : leaderboard[0]

    return NextResponse.json(
      {
        leaderboard,
        bestPerformer,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    )
  } catch (error) {
    console.error("Error fetching team stats:", error)
    return NextResponse.json({ error: "Failed to fetch team stats" }, { status: 500 })
  }
}
