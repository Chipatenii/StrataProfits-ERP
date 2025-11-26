"use client"

import { useState } from "react"
import { X, PartyPopper, Clock } from "lucide-react"
import { formatDuration, getTimeStatusMessage } from "@/lib/time-utils"

interface TaskCompletionModalProps {
    isOpen: boolean
    onClose: () => void
    onComplete: (notes: string) => Promise<void>
    taskTitle: string
    spentMinutes: number
    estimatedHours?: number
}

export function TaskCompletionModal({
    isOpen,
    onClose,
    onComplete,
    taskTitle,
    spentMinutes,
    estimatedHours,
}: TaskCompletionModalProps) {
    const [notes, setNotes] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showConfetti, setShowConfetti] = useState(false)

    const handleSubmit = async () => {
        setIsSubmitting(true)
        setShowConfetti(true)

        try {
            await onComplete(notes)

            // Show confetti for 2 seconds then close
            setTimeout(() => {
                setShowConfetti(false)
                onClose()
                setNotes("")
            }, 2000)
        } catch (error) {
            console.error("Error completing task:", error)
            setShowConfetti(false)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
                {/* Modal */}
                <div
                    className="bg-white rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Confetti Animation */}
                    {showConfetti && (
                        <div className="absolute inset-0 pointer-events-none z-10">
                            <div className="confetti-container">
                                {[...Array(50)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="confetti"
                                        style={{
                                            left: `${Math.random() * 100}%`,
                                            animationDelay: `${Math.random() * 0.5}s`,
                                            backgroundColor: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"][
                                                Math.floor(Math.random() * 5)
                                            ],
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Header */}
                    <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white relative">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3">
                            <PartyPopper className="w-8 h-8" />
                            <div>
                                <h2 className="text-2xl font-bold">Task Complete!</h2>
                                <p className="text-green-100 text-sm mt-1">Great work finishing this task</p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        {/* Task Title */}
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Task</label>
                            <p className="text-lg font-semibold mt-1">{taskTitle}</p>
                        </div>

                        {/* Time Summary */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-900">Time Summary</span>
                            </div>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Time Spent:</span>
                                    <span className="font-semibold">{formatDuration(spentMinutes)}</span>
                                </div>
                                {estimatedHours && (
                                    <>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Estimated:</span>
                                            <span className="font-semibold">{estimatedHours}h</span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-blue-200">
                                            <span className="text-muted-foreground">Status:</span>
                                            <span className="font-semibold">{getTimeStatusMessage(spentMinutes, estimatedHours)}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Completion Notes */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Completion Notes <span className="text-muted-foreground">(Optional)</span>
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Any notes about completing this task? Challenges, learnings, etc."
                                className="w-full px-4 py-3 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                                rows={4}
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-3 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors font-medium disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-all font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? "Completing..." : "Complete Task"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
        .confetti-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -10px;
          animation: confetti-fall 3s linear forwards;
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(600px) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
        </>
    )
}
