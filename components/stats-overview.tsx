"use client"

interface Stats {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  totalTeamMembers: number
  totalHours: number
  weeklyData: Array<{ day: string; hours: number }>
}

export function StatsOverview({ stats }: { stats: Stats }) {
  const items = [
    { label: "Total tasks", value: stats.totalTasks, emphasis: false },
    { label: "In progress", value: stats.inProgressTasks, emphasis: false },
    { label: "Completed", value: stats.completedTasks, emphasis: true },
    { label: "Team members", value: stats.totalTeamMembers, emphasis: false },
    { label: "Total hours", value: stats.totalHours, emphasis: false },
  ]

  return (
    <div className="grid gap-3 md:grid-cols-5">
      {items.map(item => (
        <div
          key={item.label}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{item.label}</p>
          <p className={`text-2xl font-bold mt-1 ${item.emphasis ? "text-emerald-700 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}
