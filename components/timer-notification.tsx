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
                className={`rounded-lg shadow-lg border-2 p-4 ${type === "warning"
                        ? "bg-amber-50 border-amber-500"
                        : "bg-red-50 border-red-500"
                    }`}
            >
                <div className="flex items-start gap-3">
                    <div
                        className={`p-2 rounded-full ${type === "warning" ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                            }`}
                    >
                        {type === "warning" ? (
                            <Clock className="w-5 h-5" />
                        ) : (
                            <AlertTriangle className="w-5 h-5" />
                        )}
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-sm mb-1">
                            {type === "warning" ? "⏰ Time Warning!" : "⚠️ Time Limit Reached!"}
                        </h4>
                        <p className="text-sm text-gray-700 mb-2">
                            <strong>{taskTitle}</strong>
                        </p>
                        {type === "warning" && remainingMinutes !== undefined && (
                            <p className="text-sm text-gray-600">
                                Only <strong>{remainingMinutes} minutes</strong> remaining of allocated time.
                                Please plan to complete soon.
                            </p>
                        )}
                        {type === "elapsed" && (
                            <p className="text-sm text-gray-600">
                                Your allocated time has elapsed. The timer has been automatically paused.
                                You can resume if needed, but this task will be flagged for admin review.
                            </p>
                        )}
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                        aria-label="Close notification"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
