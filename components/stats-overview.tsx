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
  return (
    <div className="grid md:grid-cols-5 gap-4">
      <div className="glass-card border-border/30 rounded-xl p-6">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">Total Tasks</p>
          <p className="text-3xl font-bold text-primary mt-2">{stats.totalTasks}</p>
        </div>
      </div>
      <div className="glass-card border-border/30 rounded-xl p-6">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">In Progress</p>
          <p className="text-3xl font-bold text-accent mt-2">{stats.inProgressTasks}</p>
        </div>
      </div>
      <div className="glass-card border-border/30 rounded-xl p-6">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">Completed</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.completedTasks}</p>
        </div>
      </div>
      <div className="glass-card border-border/30 rounded-xl p-6">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">Team Members</p>
          <p className="text-3xl font-bold text-primary mt-2">{stats.totalTeamMembers}</p>
        </div>
      </div>
      <div className="glass-card border-border/30 rounded-xl p-6">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">Total Hours</p>
          <p className="text-3xl font-bold text-accent mt-2">{stats.totalHours}</p>
        </div>
      </div>
    </div>
  )
}
