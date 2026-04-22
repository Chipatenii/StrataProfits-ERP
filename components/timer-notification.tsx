"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Clock, X } from "lucide-react"

interface TimerNotificationProps {
    type: "warning" | "elapsed"
    taskTitle: string
    remainingMinutes?: number
    onClose: () => void
    playSound?: boolean
}

export function TimerNotification({
    type,
    taskTitle,
    remainingMinutes,
    onClose,
    playSound = true,
}: TimerNotificationProps) {
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        if (playSound && typeof window !== "undefined") {
            // Play a notification sound (using browser's built-in beep)
            try {
                const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
                const oscillator = audioContext.createOscillator()
                const gainNode = audioContext.createGain()

                oscillator.connect(gainNode)
                gainNode.connect(audioContext.destination)

                oscillator.frequency.value = type === "elapsed" ? 440 : 880
                oscillator.type = "sine"

                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

                oscillator.start(audioContext.currentTime)
                oscillator.stop(audioContext.currentTime + 0.5)
            } catch (error) {
                console.error("Error playing notification sound:", error)
            }
        }
    }, [type, playSound])

    const handleClose = () => {
        setVisible(false)
        setTimeout(onClose, 300)
    }

    if (!visible) return null

    return (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 max-w-md">
            <div
                className={`rounded-xl border p-4 bg-white dark:bg-slate-900 ${type === "warning"
                    ? "border-amber-200 dark:border-amber-900/40"
                    : "border-rose-200 dark:border-rose-900/40"
                    }`}
            >
                <div className="flex items-start gap-3">
                    <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${type === "warning"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                            : "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                            }`}
                    >
                        {type === "warning" ? (
                            <Clock className="w-4 h-4" />
                        ) : (
                            <AlertTriangle className="w-4 h-4" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-1">
                            {type === "warning" ? "Time warning" : "Time limit reached"}
                        </h4>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-2 truncate">
                            {taskTitle}
                        </p>
                        {type === "warning" && remainingMinutes !== undefined && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Only <span className="font-semibold text-slate-700 dark:text-slate-200">{remainingMinutes} minutes</span> remaining of allocated time. Please plan to complete soon.
                            </p>
                        )}
                        {type === "elapsed" && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Your allocated time has elapsed. The timer has been automatically paused. You can resume if needed, but this task will be flagged for admin review.
                            </p>
                        )}
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                        aria-label="Close notification"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
