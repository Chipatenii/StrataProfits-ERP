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
  const [showWarning, setShowWarning] = useState(false)
  const [limitReached, setLimitReached] = useState(false)

  // Reset states when modal opens or task changes
  useEffect(() => {
    if (open) {
      setSeconds(0)
      setIsRunning(false)
      setShowWarning(false)
      setLimitReached(false)
    }
  }, [open, task])

  useEffect(() => {
    if (!isRunning || !open || !task) return

    const interval = setInterval(() => {
      setSeconds((s) => {
        const newSeconds = s + 1

        // Check time limits if estimatedHours exists
        if (task.estimatedHours) {
          const currentSessionMinutes = newSeconds / 60
          const totalMinutes = task.timeSpent + currentSessionMinutes
          const limitMinutes = task.estimatedHours * 60
          const remainingMinutes = limitMinutes - totalMinutes

          // Auto-stop if limit reached
          if (remainingMinutes <= 0 && !limitReached) {
            setIsRunning(false)
            setLimitReached(true)
            // Save the time automatically up to the limit? 
            // For now, let's just stop and let user save what they have, or maybe force save.
            // User request: "stop when time has elapsed".
            return newSeconds
          }

          // Warning if less than 5 minutes remaining
          if (remainingMinutes <= 5 && remainingMinutes > 0) {
            setShowWarning(true)
          } else {
            setShowWarning(false)
          }
        }

        return newSeconds
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, open, task, limitReached])

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
      setLimitReached(false)
      setShowWarning(false)
    }
  }

  const handleAddCustomTime = () => {
    if (!task || !customMinutes) return
    const mins = Number.parseInt(customMinutes)

    // Check limit for custom time addition
    if (task.estimatedHours) {
      const totalMinutes = task.timeSpent + mins
      if (totalMinutes > task.estimatedHours * 60) {
        alert(`Cannot add ${mins} minutes. It would exceed the estimated time limit.`)
        return
      }
    }

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
              {task.estimatedHours && (
                <div className="flex justify-between text-xs mt-2 text-muted-foreground">
                  <span>Est: {task.estimatedHours}h</span>
                  <span>Remaining: {Math.max(0, (task.estimatedHours * 60) - task.timeSpent - Math.floor(seconds / 60)).toFixed(0)}m</span>
                </div>
              )}
            </div>
          )}

          {/* Warnings */}
          {limitReached && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium text-center animate-pulse">
              Time limit reached! Timer stopped.
            </div>
          )}
          {showWarning && !limitReached && (
            <div className="p-3 rounded-lg bg-orange-100 border border-orange-200 text-orange-700 text-sm font-medium text-center">
              Warning: Less than 5 minutes remaining!
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
              disabled={limitReached}
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
                setLimitReached(false)
                setShowWarning(false)
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
