"use client"

import { useEffect, useState, useRef } from "react"
import { shouldShowWarning, hasTimeElapsed, getRemainingMinutesFromStart } from "@/lib/time-utils"

interface TimerProps {
  isActive: boolean
  startTime: string | null
  estimatedHours?: number
  onWarning?: (remainingMinutes: number) => void
  onTimeElapsed?: () => void
}

export function Timer({ isActive, startTime, initialSeconds = 0, estimatedHours, onWarning, onTimeElapsed }: TimerProps & { initialSeconds?: number }) {
  const [elapsed, setElapsed] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [timeStatus, setTimeStatus] = useState<"good" | "warning" | "exceeded">("good")
  const warningShownRef = useRef(false)
  const elapsedShownRef = useRef(false)

  useEffect(() => {
    // If not active, just show initialSeconds
    if (!isActive) {
      const totalSeconds = initialSeconds
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60
      setElapsed({ hours, minutes, seconds })
      return
    }

    if (!startTime) return

    const interval = setInterval(() => {
      const start = new Date(startTime)
      const now = new Date()
      const diff = now.getTime() - start.getTime()

      const currentSessionSeconds = Math.floor(diff / 1000)
      const totalSeconds = initialSeconds + currentSessionSeconds

      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      setElapsed({ hours, minutes, seconds })

      // Check for warnings and elapsed time
      if (estimatedHours) {
        // Note: Logic for warning checks might need to consider total accumulated time if that's the intent
        // For now keeping it based on start time as per original but it might differ slightly if paused/resumed
        // Better to use totalSeconds for logic if estimatedHours applies to TOTAL time on task
        const totalMinutes = totalSeconds / 60

        if (totalMinutes >= estimatedHours * 60 && !elapsedShownRef.current) {
          setTimeStatus("exceeded")
          elapsedShownRef.current = true
          onTimeElapsed?.()
        } else if (estimatedHours * 60 - totalMinutes <= 15 && !warningShownRef.current && totalMinutes < estimatedHours * 60) {
          // Warning logic: 15 mins remaining
          setTimeStatus("warning")
          // Calculate remaining properly
          const remaining = Math.max(0, estimatedHours * 60 - totalMinutes)
          warningShownRef.current = true
          onWarning?.(remaining)
        } else if (totalMinutes < estimatedHours * 60 && estimatedHours * 60 - totalMinutes > 15) {
          setTimeStatus("good")
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, startTime, initialSeconds, estimatedHours, onWarning, onTimeElapsed])

  // Reset warning flags when timer is restarted
  useEffect(() => {
    if (isActive && startTime) {
      warningShownRef.current = false
      elapsedShownRef.current = false
    }
  }, [startTime, isActive])

  const getTimerColor = () => {
    switch (timeStatus) {
      case "exceeded":
        return "text-red-600"
      case "warning":
        return "text-amber-600"
      default:
        return "text-accent"
    }
  }

  return (
    <div className={`font-mono font-medium ${getTimerColor()} transition-colors duration-300`}>
      {String(elapsed.hours).padStart(2, "0")}:{String(elapsed.minutes).padStart(2, "0")}:
      {String(elapsed.seconds).padStart(2, "0")}
    </div>
  )
}
