"use client"

import { useState } from "react"
import { useAppState } from "@/lib/state"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Edit2, Clock, CheckCircle2, Circle, Calendar, FileText, Users } from "lucide-react"
import { CreateTaskModal } from "@/components/modals/create-task-modal"
import { EditTaskModal } from "@/components/modals/edit-task-modal"
import { TimeTrackerModal } from "@/components/modals/time-tracker-modal"
import { createClient } from "@/lib/supabase/client"

export function TaskList() {
  const { tasks, setTasks, deleteTask, teamMembers } = useAppState()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active")
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null)
  const supabase = createClient()

  const handleEditClick = (task: any) => {
    setSelectedTask(task)
    setShowEditModal(true)
  }

  const handleTimeClick = (task: any) => {
    setSelectedTask(task)
    setShowTimeModal(true)
  }

  const handleCompleteTask = async (task: any) => {
    if (task.status === "completed") return

    setCompletingTaskId(task.id)

    // Animate first, then update
    setTimeout(async () => {
      try {
        const { error } = await supabase
          .from("tasks")
          .update({
            status: "completed",
            completed_at: new Date().toISOString()
          })
          .eq("id", task.id)

        if (!error) {
          setTasks(tasks.map(t =>
            t.id === task.id
              ? { ...t, status: "completed", completed_at: new Date().toISOString() }
              : t
          ))
        }
      } catch (err) {
        console.error("Error completing task:", err)
      } finally {
        setCompletingTaskId(null)
      }
    }, 600) // Wait for animation
  }

  const getAssigneeName = (assignedTo?: string) => {
    if (!assignedTo) return "Unassigned"
    return teamMembers.find((m) => m.id === assignedTo)?.name || "Unknown"
  }

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m}m`
    return `${h}h ${m}m`
  }

  const filteredTasks = tasks.filter(task => {
    if (activeTab === "active") return task.status !== "completed"
    return task.status === "completed"
  })

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-primary">Tasks</h2>
          <p className="text-sm text-muted-foreground">Manage your team's workload</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-muted/30 rounded-lg mb-6 w-fit">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === "active"
            ? "bg-white text-primary shadow-sm"
            : "text-muted-foreground hover:text-foreground"
            }`}
        >
          Active Tasks
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === "completed"
            ? "bg-white text-primary shadow-sm"
            : "text-muted-foreground hover:text-foreground"
            }`}
        >
          Completed
        </button>
      </div>

      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-muted/10 rounded-2xl border border-dashed border-border">
            <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground mb-4">
              {activeTab === "active"
                ? "No active tasks. You're all caught up!"
                : "No completed tasks yet."}
            </p>
            {activeTab === "active" && (
              <Button
                onClick={() => setShowCreateModal(true)}
                variant="outline"
              >
                Create First Task
              </Button>
            )}
          </div>
        ) : (
          filteredTasks.map((task) => (
            <Card
              key={task.id}
              className={`glass-card border-border/30 hover:border-border/50 transition-all duration-500 ${completingTaskId === task.id ? "scale-95 opacity-0 translate-x-10" : "opacity-100"
                }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {/* Checkbox for completion */}
                  <button
                    onClick={() => handleCompleteTask(task)}
                    disabled={task.status === "completed"}
                    className={`mt-1 flex-shrink-0 transition-colors ${task.status === "completed"
                      ? "text-green-500 cursor-default"
                      : "text-muted-foreground hover:text-green-500"
                      }`}
                  >
                    {task.status === "completed" ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <Circle className="w-6 h-6" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className={`text-lg font-semibold text-foreground ${task.status === "completed" ? "line-through text-muted-foreground" : ""
                          }`}>
                          {task.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                        {task.status !== "completed" && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 bg-transparent hover:bg-primary/10 hover:text-primary"
                            onClick={() => handleTimeClick(task)}
                            title="Track time"
                          >
                            <Clock className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 bg-transparent hover:bg-blue-50 hover:text-blue-600"
                          onClick={() => handleEditClick(task)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 bg-transparent hover:bg-red-50 hover:text-red-600"
                          onClick={() => deleteTask(task.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-3 flex-wrap items-center">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${task.priority === "high" ? "bg-red-100 text-red-700" :
                        task.priority === "medium" ? "bg-amber-100 text-amber-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                        {task.priority} Priority
                      </span>

                      <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {getAssigneeName(task.assignedTo)}
                      </span>

                      {task.estimatedHours && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Est: {task.estimatedHours}h
                        </span>
                      )}

                      {task.timeSpent > 0 && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Spent: {formatTime(task.timeSpent)}
                        </span>
                      )}

                      {task.completed_at && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                          <Calendar className="w-3 h-3" />
                          Completed: {new Date(task.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <CreateTaskModal open={showCreateModal} onOpenChange={setShowCreateModal} />
      <EditTaskModal open={showEditModal} task={selectedTask} onOpenChange={setShowEditModal} />
      <TimeTrackerModal open={showTimeModal} task={selectedTask} onOpenChange={setShowTimeModal} />
    </>
  )
}
