"use client"

import { useEffect, useState } from "react"

interface TimerProps {
  isActive: boolean
  startTime: string | null
}

export function Timer({ isActive, startTime }: TimerProps) {
  const [elapsed, setElapsed] = useState({ hours: 0, minutes: 0, seconds: 0 })

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
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, startTime])

  return (
    <div className="text-4xl font-bold font-mono text-accent">
      {String(elapsed.hours).padStart(2, "0")}:{String(elapsed.minutes).padStart(2, "0")}:
      {String(elapsed.seconds).padStart(2, "0")}
    </div>
  )
}
