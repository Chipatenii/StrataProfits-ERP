"use client"

import { useState, useEffect } from "react"
import { useAppState, type Task } from "@/lib/state"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Play, Pause, RotateCcw, Clock } from "lucide-react"

interface TimeTrackerModalProps {
  open: boolean
  task: Task | null
  onOpenChange: (open: boolean) => void
}

export function TimeTrackerModal({ open, task, onOpenChange }: TimeTrackerModalProps) {
  const { addTimeToTask } = useAppState()
  const [seconds, setSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [customMinutes, setCustomMinutes] = useState("")

  useEffect(() => {
    if (!isRunning || !open) return

    const interval = setInterval(() => {
      setSeconds((s) => s + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, open])

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const formatTime = (h: number, m: number, s: number) => {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  const handleAddTime = () => {
    if (!task) return
    if (seconds > 0) {
      addTimeToTask(task.id, Math.ceil(seconds / 60))
      setSeconds(0)
      setIsRunning(false)
    }
  }

  const handleAddCustomTime = () => {
    if (!task || !customMinutes) return
    const mins = Number.parseInt(customMinutes)
    if (mins > 0) {
      addTimeToTask(task.id, mins)
      setCustomMinutes("")
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Time Tracker
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Info */}
          {task && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground">Current Task</p>
              <p className="font-semibold text-foreground">{task.title}</p>
            </div>
          )}

          {/* Timer Display */}
          <div className="text-center">
            <div className="text-5xl font-bold text-primary font-mono mb-2">{formatTime(hours, minutes, secs)}</div>
            <p className="text-sm text-muted-foreground">Hours : Minutes : Seconds</p>
          </div>

          {/* Timer Controls */}
          <div className="flex gap-2 justify-center">
            <Button
              variant={isRunning ? "outline" : "default"}
              size="sm"
              onClick={() => setIsRunning(!isRunning)}
              className={
                isRunning
                  ? ""
                  : "px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
              }
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  Start
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSeconds(0)
                setIsRunning(false)
              }}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Current Time Summary */}
          {task && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Previously logged:</span>
                <span className="font-semibold text-accent">
                  {Math.floor(task.timeSpent / 60)}h {task.timeSpent % 60}m
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">This session:</span>
                <span className="font-semibold text-primary">
                  {minutes}m {secs}s
                </span>
              </div>
            </div>
          )}

          {/* Custom Time Input */}
          <div className="border-t border-border/30 pt-4">
            <Label htmlFor="customMinutes" className="text-sm text-foreground font-medium mb-2 block">
              Or add time manually (minutes)
            </Label>
            <div className="flex gap-2">
              <Input
                id="customMinutes"
                type="number"
                placeholder="Enter minutes"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                min="1"
                className="bg-card border-border/30"
              />
              <Button
                onClick={handleAddCustomTime}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Add
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddTime}
              disabled={seconds === 0}
              className="px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Save Time ({Math.ceil(seconds / 60)}m)
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
