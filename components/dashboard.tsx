"use client"

import { useState } from "react"
import { useAppState } from "@/lib/state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/header"
import { TaskList } from "@/components/task-list"
import { TeamMembers } from "@/components/team-members"
import { StatsOverview } from "@/components/stats-overview"

export function Dashboard() {
  const { tasks, teamMembers, stats } = useAppState()
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "team">("overview")

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8">
          {(["overview", "tasks", "team"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card border border-border/30 text-foreground hover:border-border/50"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content Based on Active Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <StatsOverview stats={stats} />

            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Card className="glass-card border-border/30">
                  <CardHeader>
                    <CardTitle className="text-primary">Recent Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tasks.length === 0 ? (
                      <p className="text-muted-foreground">No tasks created yet</p>
                    ) : (
                      <div className="space-y-3">
                        {tasks.slice(0, 5).map((task) => (
                          <div key={task.id} className="task-card">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-foreground">{task.title}</h4>
                                <p className="text-sm text-muted-foreground">{task.description}</p>
                              </div>
                              <div className="text-right">
                                <span
                                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                    task.status === "completed"
                                      ? "bg-green-100 text-green-700"
                                      : task.status === "in-progress"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {task.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="glass-card border-border/30">
                  <CardHeader>
                    <CardTitle className="text-primary text-lg">Team</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {teamMembers.map((member) => (
                        <div key={member.id} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{member.name}</span>
                          <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded">
                            {tasks.filter((t) => t.assignedTo === member.id).length} tasks
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {activeTab === "tasks" && <TaskList />}

        {activeTab === "team" && <TeamMembers />}
      </main>
    </div>
  )
}
