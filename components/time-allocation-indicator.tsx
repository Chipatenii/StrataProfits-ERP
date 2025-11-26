"use client"

import { getProgressColor, getTimePercentage } from "@/lib/time-utils"

interface TimeAllocationIndicatorProps {
    spentMinutes: number
    estimatedHours: number
    size?: "sm" | "md" | "lg"
    showLabel?: boolean
}

export function TimeAllocationIndicator({
    spentMinutes,
    estimatedHours,
    size = "md",
    showLabel = true,
}: TimeAllocationIndicatorProps) {
    const percentage = getTimePercentage(spentMinutes, estimatedHours)
    const color = getProgressColor(percentage)

    // Size configurations
    const sizeConfig = {
        sm: { radius: 20, stroke: 3, fontSize: "text-xs" },
        md: { radius: 30, stroke: 4, fontSize: "text-sm" },
        lg: { radius: 40, stroke: 5, fontSize: "text-base" },
    }

    const config = sizeConfig[size]
    const circumference = 2 * Math.PI * config.radius
    const offset = circumference - (Math.min(percentage, 100) / 100) * circumference

    const spentHours = (spentMinutes / 60).toFixed(1)

    return (
        <div className="flex flex-col items-center gap-2">
            {/* Circular Progress */}
            <div className="relative" style={{ width: config.radius * 2 + 20, height: config.radius * 2 + 20 }}>
                <svg
                    className="transform -rotate-90"
                    width={config.radius * 2 + 20}
                    height={config.radius * 2 + 20}
                    viewBox={`0 0 ${config.radius * 2 + 20} ${config.radius * 2 + 20}`}
                >
                    {/* Background circle */}
                    <circle
                        cx={config.radius + 10}
                        cy={config.radius + 10}
                        r={config.radius}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth={config.stroke}
                    />
                    {/* Progress circle */}
                    <circle
                        cx={config.radius + 10}
                        cy={config.radius + 10}
                        r={config.radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={config.stroke}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="transition-all duration-500 ease-out"
                    />
                </svg>
                {/* Percentage text */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`font-bold ${config.fontSize}`} style={{ color }}>
                        {percentage}%
                    </span>
                </div>
            </div>

            {/* Label */}
            {showLabel && (
                <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                        {spentHours}h / {estimatedHours}h
                    </p>
                </div>
            )}
        </div>
    )
}
