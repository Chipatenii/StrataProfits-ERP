"use client"

import useSWR from "swr"
import { Clock, Crown, TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"

interface EfficiencyData {
  id: string
  name: string
  completedCount: number
  totalEstimated: number
  totalActual: number
  efficiencyRatio: number
}

interface AgingTaskData {
  id: string
  title: string
  assignedTo: string
  updatedAt: string
  daysAging: number
}

interface PerformanceStats {
  userEfficiency: EfficiencyData[]
  agingTasks: AgingTaskData[]
}

export function TeamPerformanceView() {
  const fetcher = (url: string) => fetch(url).then(r => r.json())
  const { data: stats, isLoading: loading, mutate } = useSWR<PerformanceStats>(
    '/api/admin/performance',
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true }
  )

  useRealtimeSubscription("tasks", () => { mutate() })
  useRealtimeSubscription("time_logs", () => { mutate() })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading performance data...</p>
      </div>
    )
  }

  const userEfficiency = stats?.userEfficiency || []
  const agingTasks = stats?.agingTasks || []

  const topPerformers = [...userEfficiency].sort((a, b) => b.efficiencyRatio - a.efficiencyRatio).slice(0, 3)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">Team performance</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Monitor team productivity and spot aging roadblocks.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main column: top performers + efficiency */}
        <div className="lg:col-span-2 space-y-4">
          {/* Top performers */}
          <div className="grid sm:grid-cols-3 gap-4">
            {topPerformers.map((user, idx) => {
              const accent = idx === 0 ? "bg-amber-500" : idx === 1 ? "bg-slate-400" : "bg-orange-500"
              return (
                <div key={user.id} className="relative bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className={`absolute top-0 left-0 w-full h-0.5 ${accent}`} />
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                      {idx === 0 ? <Crown className="w-5 h-5 text-amber-500" /> : <TrendingUp className="w-5 h-5 text-emerald-700" />}
                    </div>
                    <span className="text-xl font-bold text-slate-200 dark:text-slate-700">#{idx + 1}</span>
                  </div>
                  <h3 className="font-semibold text-sm truncate text-slate-900 dark:text-white mb-1">{user.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{user.completedCount} tasks completed</span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Efficiency ratio</p>
                    <p className={`text-lg font-bold ${user.efficiencyRatio >= 1 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {user.efficiencyRatio.toFixed(2)}x
                    </p>
                  </div>
                </div>
              )
            })}

            {topPerformers.length === 0 && (
              <div className="sm:col-span-3 bg-white dark:bg-slate-900 rounded-xl p-8 text-center border border-slate-200 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400">No efficiency data available yet. Complete some tasks with estimated tracking to see top performers.</p>
              </div>
            )}
          </div>

          {/* Efficiency table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">Team efficiency matrix</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3 font-medium">Team member</th>
                    <th className="px-5 py-3 font-medium text-center">Tasks</th>
                    <th className="px-5 py-3 font-medium text-center">Est. hours</th>
                    <th className="px-5 py-3 font-medium text-center">Actual hours</th>
                    <th className="px-5 py-3 font-medium text-right">Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {userEfficiency.map((user) => {
                    const isEfficient = user.efficiencyRatio >= 1
                    return (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{user.name}</td>
                        <td className="px-5 py-3 text-center text-slate-600 dark:text-slate-400">{user.completedCount}</td>
                        <td className="px-5 py-3 text-center font-mono text-slate-600 dark:text-slate-400">{user.totalEstimated.toFixed(1)}h</td>
                        <td className="px-5 py-3 text-center font-mono text-slate-600 dark:text-slate-400">{user.totalActual.toFixed(1)}h</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${isEfficient ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'}`}>
                            {isEfficient ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {user.efficiencyRatio.toFixed(2)}x
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {userEfficiency.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        Not enough data. Estimates and actual logs are required on completed tasks.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column: aging tasks */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <h3 className="font-semibold text-base text-slate-900 dark:text-white">Aging tasks</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tasks stuck in &quot;In Progress&quot; for more than 5 days.
              </p>
            </div>

            <div className="p-3 space-y-2">
              {agingTasks.map(task => (
                <div key={task.id} className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="font-semibold text-sm line-clamp-2 text-rose-950 dark:text-rose-200">{task.title}</h4>
                    <span className="whitespace-nowrap px-1.5 py-0.5 rounded bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 text-[10px] font-semibold">
                      {task.daysAging}d
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-400 mb-2">
                    <Clock className="w-3 h-3" />
                    <span>Last updated: {new Date(task.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="inline-block px-2 py-0.5 bg-white/70 dark:bg-black/20 rounded text-xs font-medium text-rose-800 dark:text-rose-300">
                    {task.assignedTo}
                  </div>
                </div>
              ))}

              {agingTasks.length === 0 && (
                <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-2 opacity-60" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No aging tasks found. The team is moving fast.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
