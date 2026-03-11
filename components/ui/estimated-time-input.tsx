"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
            <Label className="text-foreground font-medium">{label}</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Hours</label>
                    <Input
                        type="number"
                        min="0"
                        step="1"
                        value={hours}
                        onChange={(e) => onHoursChange(e.target.value)}
                        className="bg-card border-border/30"
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Minutes</label>
                    <Input
                        type="number"
                        min="0"
                        max="59"
                        step="5"
                        value={minutes}
                        onChange={(e) => onMinutesChange(e.target.value)}
                        className="bg-card border-border/30"
                        placeholder="0"
                    />
                </div>
            </div>
        </div>
    )
}
