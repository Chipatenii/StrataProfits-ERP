"use client"

import { useState } from "react"
import useSWR from "swr"
import { Activity, Clock, Crown, TrendingUp, TrendingDown, AlertCircle, BarChart, CheckCircle2 } from "lucide-react"
import { Loader2 } from "lucide-react"

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
  const { data: stats, isLoading: loading } = useSWR<PerformanceStats>('/api/admin/performance', fetcher)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading performance data...</p>
      </div>
    )
  }

  const userEfficiency = stats?.userEfficiency || []
  const agingTasks = stats?.agingTasks || []

  // Top performers based on ratio (> 1 means they take less time than estimated)
  const topPerformers = [...userEfficiency].sort((a, b) => b.efficiencyRatio - a.efficiencyRatio).slice(0, 3)

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-primary p-8 md:p-10 text-white shadow-2xl shadow-primary/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-emerald-300" />
            <span className="text-sm font-medium text-emerald-100 uppercase tracking-wider">Team Performance</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Efficiency & Velocity</h1>
          <p className="text-emerald-100/80 text-lg">Monitor team productivity and spot aging roadblocks.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Column: Top Performers & Efficiency */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Top Performers */}
          <div className="grid sm:grid-cols-3 gap-4">
            {topPerformers.map((user, idx) => (
              <div key={user.id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800 shadow-xl shadow-black/5 dark:shadow-black/20 relative overflow-hidden group">
                {idx === 0 && <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />}
                {idx === 1 && <div className="absolute top-0 left-0 w-full h-1 bg-slate-400" />}
                {idx === 2 && <div className="absolute top-0 left-0 w-full h-1 bg-orange-500" />}
                
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl rounded-tr-sm rounded-bl-sm">
                    {idx === 0 ? <Crown className="w-6 h-6 text-amber-500" /> : <TrendingUp className="w-6 h-6 text-emerald-500" />}
                  </div>
                  <span className="text-2xl font-black text-slate-200 dark:text-slate-800">#{idx + 1}</span>
                </div>
                
                <h3 className="font-bold text-lg truncate mb-1">{user.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>{user.completedCount} tasks completed</span>
                </div>
                
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Efficiency Ratio</p>
                    <p className={`text-xl font-bold ${user.efficiencyRatio >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {user.efficiencyRatio.toFixed(2)}x
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {topPerformers.length === 0 && (
              <div className="sm:col-span-3 bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200/50 dark:border-slate-800">
                <p className="text-muted-foreground">No efficiency data available yet. Complete some tasks with estimated tracking to see top performers.</p>
              </div>
            )}
          </div>

          {/* Detailed Efficiency Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-xl shadow-black/5 dark:shadow-black/20 overflow-hidden">
            <div className="p-6 border-b border-slate-200/50 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                  <BarChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold">Team Efficiency Matrix</h3>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/50 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Team Member</th>
                    <th className="px-6 py-4 font-semibold text-center">Tasks</th>
                    <th className="px-6 py-4 font-semibold text-center">Est. Hours</th>
                    <th className="px-6 py-4 font-semibold text-center">Actual Hours</th>
                    <th className="px-6 py-4 font-semibold text-right">Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                  {userEfficiency.map((user) => {
                    const isEfficient = user.efficiencyRatio >= 1
                    return (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-4 font-medium">{user.name}</td>
                        <td className="px-6 py-4 text-center text-muted-foreground">{user.completedCount}</td>
                        <td className="px-6 py-4 text-center font-mono text-slate-600 dark:text-slate-400">{user.totalEstimated.toFixed(1)}h</td>
                        <td className="px-6 py-4 text-center font-mono text-slate-600 dark:text-slate-400">{user.totalActual.toFixed(1)}h</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${isEfficient ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'}`}>
                            {isEfficient ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {user.efficiencyRatio.toFixed(2)}x
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {userEfficiency.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                        Not enough data. Estimates and actual logs are required on completed tasks.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Aging tasks */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800 shadow-xl shadow-black/5 dark:shadow-black/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-rose-100 dark:bg-rose-900/50 rounded-xl">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="text-xl font-bold">Aging Tasks</h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">
              Tasks stuck in "In Progress" for more than 5 days.
            </p>

            <div className="space-y-4">
              {agingTasks.map(task => (
                <div key={task.id} className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-sm line-clamp-2 text-rose-950 dark:text-rose-200">{task.title}</h4>
                    <span className="whitespace-nowrap px-2 py-1 rounded-md bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 text-[10px] font-bold">
                      {task.daysAging} days
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400">
                    <Clock className="w-3 h-3" />
                    <span>Last updated: {new Date(task.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-3 inline-block px-2 py-1 bg-white/60 dark:bg-black/20 rounded text-xs font-medium text-rose-800 dark:text-rose-300">
                    {task.assignedTo}
                  </div>
                </div>
              ))}
              
              {agingTasks.length === 0 && (
                <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-slate-500">No aging tasks found. The team is moving fast!</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
