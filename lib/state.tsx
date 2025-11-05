"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export interface Task {
  id: string
  title: string
  description: string
  status: "pending" | "in-progress" | "completed"
  priority: "low" | "medium" | "high"
  assignedTo?: string
  dueDate?: string
  createdAt: string
  timeSpent: number // in minutes
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

export interface Stats {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  totalTeamMembers: number
  totalHours: number
  weeklyData: Array<{ day: string; hours: number }>
}

interface AppContextType {
  tasks: Task[]
  teamMembers: TeamMember[]
  stats: Stats
  createTask: (task: Omit<Task, "id" | "createdAt">) => void
  updateTask: (id: string, task: Partial<Task>) => void
  deleteTask: (id: string) => void
  createTeamMember: (member: Omit<TeamMember, "id" | "createdAt">) => void
  updateTeamMember: (id: string, member: Partial<TeamMember>) => void
  deleteTeamMember: (id: string) => void
  addTimeToTask: (taskId: string, minutes: number) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [mounted, setMounted] = useState(false)

  // Load from localStorage
  useEffect(() => {
    const savedTasks = localStorage.getItem("tasks")
    const savedMembers = localStorage.getItem("teamMembers")

    if (savedTasks) setTasks(JSON.parse(savedTasks))
    if (savedMembers) setTeamMembers(JSON.parse(savedMembers))
    setMounted(true)
  }, [])

  // Save to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("tasks", JSON.stringify(tasks))
    }
  }, [tasks, mounted])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("teamMembers", JSON.stringify(teamMembers))
    }
  }, [teamMembers, mounted])

  const createTask = (task: Omit<Task, "id" | "createdAt">) => {
    setTasks([
      ...tasks,
      {
        ...task,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      },
    ])
  }

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id))
  }

  const createTeamMember = (member: Omit<TeamMember, "id" | "createdAt">) => {
    setTeamMembers([
      ...teamMembers,
      {
        ...member,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      },
    ])
  }

  const updateTeamMember = (id: string, updates: Partial<TeamMember>) => {
    setTeamMembers(teamMembers.map((m) => (m.id === id ? { ...m, ...updates } : m)))
  }

  const deleteTeamMember = (id: string) => {
    setTeamMembers(teamMembers.filter((m) => m.id !== id))
  }

  const addTimeToTask = (taskId: string, minutes: number) => {
    updateTask(taskId, {
      timeSpent: (tasks.find((t) => t.id === taskId)?.timeSpent || 0) + minutes,
    })
  }

  const stats: Stats = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter((t) => t.status === "completed").length,
    inProgressTasks: tasks.filter((t) => t.status === "in-progress").length,
    totalTeamMembers: teamMembers.length,
    totalHours: Math.round(tasks.reduce((acc, t) => acc + t.timeSpent, 0) / 60),
    weeklyData: generateWeeklyData(tasks),
  }

  return (
    <AppContext.Provider
      value={{
        tasks,
        teamMembers,
        stats,
        createTask,
        updateTask,
        deleteTask,
        createTeamMember,
        updateTeamMember,
        deleteTeamMember,
        addTimeToTask,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useAppState() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useAppState must be used within AppProvider")
  }
  return context
}

function generateWeeklyData(tasks: Task[]) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  return days.map((day, idx) => ({
    day,
    hours: Math.floor(Math.random() * 8),
  }))
}
