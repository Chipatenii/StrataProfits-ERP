"use client"

import { Input } from "@/components/ui/input"

interface EstimatedTimeInputProps {
    hours: string
    minutes: string
    onHoursChange: (value: string) => void
    onMinutesChange: (value: string) => void
    label?: string
    className?: string
}

export function EstimatedTimeInput({
    hours,
    minutes,
    onHoursChange,
    onMinutesChange,
    label = "Estimated Time",
    className = "",
}: EstimatedTimeInputProps) {
    return (
        <div className={className}>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
                <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">Hours</label>
                    <Input
                        type="number"
                        min="0"
                        step="1"
                        value={hours}
                        onChange={(e) => onHoursChange(e.target.value)}
                        className="rounded-lg border-slate-200 dark:border-slate-800"
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">Minutes</label>
                    <Input
                        type="number"
                        min="0"
                        max="59"
                        step="5"
                        value={minutes}
                        onChange={(e) => onMinutesChange(e.target.value)}
                        className="rounded-lg border-slate-200 dark:border-slate-800"
                        placeholder="0"
                    />
                </div>
            </div>
        </div>
    )
}
