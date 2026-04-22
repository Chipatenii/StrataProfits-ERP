"use client"

import { useState, useEffect } from "react"
import { X, PartyPopper, Clock } from "lucide-react"
import { formatDuration, getTimeStatusMessage } from "@/lib/time-utils"
import { toast } from "sonner"

interface TaskCompletionModalProps {
    isOpen: boolean
    onClose: () => void
    onComplete: (notes: string, timeAllocated: number) => Promise<void>
    taskTitle: string
    spentMinutes: number
    estimatedHours?: number
}

const INPUT_CLS = "w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"

export function TaskCompletionModal({
    isOpen,
    onClose,
    onComplete,
    taskTitle,
    spentMinutes,
    estimatedHours,
}: TaskCompletionModalProps) {
    const [notes, setNotes] = useState("")
    const [allocHours, setAllocHours] = useState("0")
    const [allocMinutes, setAllocMinutes] = useState("0")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showConfetti, setShowConfetti] = useState(false)

    useEffect(() => {
        if (isOpen && spentMinutes > 0) {
            setAllocHours(String(Math.floor(spentMinutes / 60)))
            setAllocMinutes(String(Math.round(spentMinutes % 60)))
        }
    }, [isOpen, spentMinutes])

    const handleSubmit = async () => {
        const h = parseInt(allocHours) || 0
        const m = parseInt(allocMinutes) || 0
        if (h <= 0 && m <= 0) {
            toast.error("Please enter the time spent on this task")
            return
        }

        const timeVal = h + m / 60

        setIsSubmitting(true)
        setShowConfetti(true)

        try {
            await onComplete(notes, timeVal)

            setTimeout(() => {
                setShowConfetti(false)
                onClose()
                setNotes("")
                setAllocHours("0")
                setAllocMinutes("0")
            }, 2000)
        } catch (error) {
            console.error("Error completing task:", error)
            toast.error("Failed to complete task")
            setShowConfetti(false)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
                <div
                    className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full relative overflow-hidden border border-slate-200 dark:border-slate-800"
                    onClick={(e) => e.stopPropagation()}
                >
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
                                            backgroundColor: ["#047857", "#10b981", "#f59e0b", "#e11d48", "#475569"][
                                                Math.floor(Math.random() * 5)
                                            ],
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="border-b border-slate-200 dark:border-slate-800 p-5 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                                <PartyPopper className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Task Complete</h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Great work finishing this task</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-5 space-y-4">
                        <div>
                            <label className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 dark:text-slate-400">Task</label>
                            <p className="text-base font-semibold mt-1 text-slate-900 dark:text-white">{taskTitle}</p>
                        </div>

                        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-emerald-700" />
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Time Summary</span>
                            </div>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500 dark:text-slate-400">Time Spent:</span>
                                    <span className="font-mono font-semibold text-slate-900 dark:text-white">{formatDuration(spentMinutes)}</span>
                                </div>
                                {estimatedHours && (
                                    <>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 dark:text-slate-400">Estimated:</span>
                                            <span className="font-mono font-semibold text-slate-900 dark:text-white">{estimatedHours}h</span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                                            <span className="text-slate-500 dark:text-slate-400">Status:</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">{getTimeStatusMessage(spentMinutes, estimatedHours)}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                                Actual Time Spent <span className="text-rose-600">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">Hours</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={allocHours}
                                        onChange={(e) => setAllocHours(e.target.value)}
                                        placeholder="0"
                                        className={INPUT_CLS}
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">Minutes</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="59"
                                        step="5"
                                        value={allocMinutes}
                                        onChange={(e) => setAllocMinutes(e.target.value)}
                                        placeholder="0"
                                        className={INPUT_CLS}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                                Completion Notes <span className="text-slate-500 dark:text-slate-400">(Optional)</span>
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Any notes about completing this task? Challenges, learnings, etc."
                                className={`${INPUT_CLS} resize-none`}
                                rows={4}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-semibold disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
