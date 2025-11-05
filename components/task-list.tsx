"use client"

import { useState } from "react"
import { useAppState } from "@/lib/state"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Edit2, Clock } from "lucide-react"
import { CreateTaskModal } from "@/components/modals/create-task-modal"
import { EditTaskModal } from "@/components/modals/edit-task-modal"
import { TimeTrackerModal } from "@/components/modals/time-tracker-modal"

export function TaskList() {
  const { tasks, deleteTask, teamMembers } = useAppState()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)

  const handleEditClick = (task: any) => {
    setSelectedTask(task)
    setShowEditModal(true)
  }

  const handleTimeClick = (task: any) => {
    setSelectedTask(task)
    setShowTimeModal(true)
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

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-primary">All Tasks</h2>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <Card key={task.id} className="glass-card border-border/30 hover:border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">{task.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                  <div className="flex gap-3 mt-3 flex-wrap items-center">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      Priority: {task.priority}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        task.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : task.status === "in-progress"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {task.status}
                    </span>
                    <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded">
                      {getAssigneeName(task.assignedTo)}
                    </span>
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(task.timeSpent)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-transparent"
                    onClick={() => handleTimeClick(task)}
                    title="Track time"
                  >
                    <Clock className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-transparent"
                    onClick={() => handleEditClick(task)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-transparent"
                    onClick={() => deleteTask(task.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No tasks yet. Create one to get started!</p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Task
          </Button>
        </div>
      )}

      <CreateTaskModal open={showCreateModal} onOpenChange={setShowCreateModal} />
      <EditTaskModal open={showEditModal} task={selectedTask} onOpenChange={setShowEditModal} />
      <TimeTrackerModal open={showTimeModal} task={selectedTask} onOpenChange={setShowTimeModal} />
    </>
  )
}
