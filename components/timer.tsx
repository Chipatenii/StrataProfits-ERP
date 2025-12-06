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

export function Timer({ isActive, startTime, estimatedHours, onWarning, onTimeElapsed }: TimerProps) {
  const [elapsed, setElapsed] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [timeStatus, setTimeStatus] = useState<"good" | "warning" | "exceeded">("good")
  const warningShownRef = useRef(false)
  const elapsedShownRef = useRef(false)

  useEffect(() => {
    if (!isActive || !startTime) return

    const interval = setInterval(() => {
      const start = new Date(startTime)
      const now = new Date()
      const diff = now.getTime() - start.getTime()

      const totalSeconds = Math.floor(diff / 1000)
      const hours = Math.floor(totalSeconds / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      setElapsed({ hours, minutes, seconds })

      // Check for warnings and elapsed time
      if (estimatedHours) {
        if (hasTimeElapsed(startTime, estimatedHours) && !elapsedShownRef.current) {
          setTimeStatus("exceeded")
          elapsedShownRef.current = true
          onTimeElapsed?.()
        } else if (shouldShowWarning(startTime, estimatedHours) && !warningShownRef.current) {
          setTimeStatus("warning")
          const remaining = getRemainingMinutesFromStart(startTime, estimatedHours)
          warningShownRef.current = true
          onWarning?.(remaining)
        } else if (!hasTimeElapsed(startTime, estimatedHours) && !shouldShowWarning(startTime, estimatedHours)) {
          setTimeStatus("good")
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, startTime, estimatedHours, onWarning, onTimeElapsed])

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
    <div className={`text-4xl font-bold font-mono ${getTimerColor()} transition-colors duration-300`}>
      {String(elapsed.hours).padStart(2, "0")}:{String(elapsed.minutes).padStart(2, "0")}:
      {String(elapsed.seconds).padStart(2, "0")}
    </div>
  )
}
