/**
 * Time calculation and formatting utilities
 */

interface TimeLog {
    duration_minutes: number
    task_id?: string
}

/**
 * Calculate total time spent on a specific task
 */
export function calculateTimeSpent(timeLogs: TimeLog[], taskId: string): number {
    return timeLogs
        .filter((log) => log.task_id === taskId)
        .reduce((total, log) => total + (log.duration_minutes || 0), 0)
}

/**
 * Calculate percentage of time spent vs estimated
 */
export function getTimePercentage(spentMinutes: number, estimatedHours: number): number {
    if (!estimatedHours || estimatedHours <= 0) return 0
    const estimatedMinutes = estimatedHours * 60
    return Math.round((spentMinutes / estimatedMinutes) * 100)
}

/**
 * Format duration in minutes to readable format
 * Examples: "30m", "1h 30m", "2h"
 */
export function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${minutes}m`
    }

    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (remainingMinutes === 0) {
        return `${hours}h`
    }

    return `${hours}h ${remainingMinutes}m`
}

/**
 * Format duration in minutes to decimal hours
 * Example: 90 minutes -> "1.5h"
 */
export function formatHours(minutes: number): string {
    const hours = (minutes / 60).toFixed(1)
    return `${hours}h`
}

/**
 * Check if time spent exceeds estimated time
 */
export function isTimeExceeded(spentMinutes: number, estimatedHours: number): boolean {
    if (!estimatedHours || estimatedHours <= 0) return false
    const estimatedMinutes = estimatedHours * 60
    return spentMinutes > estimatedMinutes
}

/**
 * Get time status based on percentage
 * Returns: 'good' (< 80%), 'warning' (80-100%), 'exceeded' (> 100%)
 */
export function getTimeStatus(
    spentMinutes: number,
    estimatedHours: number,
): "good" | "warning" | "exceeded" | "none" {
    if (!estimatedHours || estimatedHours <= 0) return "none"

    const percentage = getTimePercentage(spentMinutes, estimatedHours)

    if (percentage > 100) return "exceeded"
    if (percentage >= 80) return "warning"
    return "good"
}

/**
 * Get color class based on time status
 */
export function getTimeStatusColor(status: "good" | "warning" | "exceeded" | "none"): string {
    switch (status) {
        case "good":
            return "text-green-600 bg-green-50 border-green-200"
        case "warning":
            return "text-yellow-600 bg-yellow-50 border-yellow-200"
        case "exceeded":
            return "text-red-600 bg-red-50 border-red-200"
        default:
            return "text-gray-600 bg-gray-50 border-gray-200"
    }
}

/**
 * Get progress ring color based on percentage
 */
export function getProgressColor(percentage: number): string {
    if (percentage > 100) return "#ef4444" // red-500
    if (percentage >= 80) return "#f59e0b" // amber-500
    return "#10b981" // green-500
}

/**
 * Calculate time remaining
 */
export function getTimeRemaining(spentMinutes: number, estimatedHours: number): number {
    if (!estimatedHours || estimatedHours <= 0) return 0
    const estimatedMinutes = estimatedHours * 60
    const remaining = estimatedMinutes - spentMinutes
    return Math.max(0, remaining)
}

/**
 * Calculate time overrun
 */
export function getTimeOverrun(spentMinutes: number, estimatedHours: number): number {
    if (!estimatedHours || estimatedHours <= 0) return 0
    const estimatedMinutes = estimatedHours * 60
    const overrun = spentMinutes - estimatedMinutes
    return Math.max(0, overrun)
}

/**
 * Format time with status message
 */
export function getTimeStatusMessage(spentMinutes: number, estimatedHours: number): string {
    const status = getTimeStatus(spentMinutes, estimatedHours)

    if (status === "none") {
        return "No time estimate set"
    }

    const percentage = getTimePercentage(spentMinutes, estimatedHours)

    if (status === "exceeded") {
        const overrun = getTimeOverrun(spentMinutes, estimatedHours)
        return `Over by ${formatDuration(overrun)} (${percentage}%)`
    }

    if (status === "warning") {
        const remaining = getTimeRemaining(spentMinutes, estimatedHours)
        return `${formatDuration(remaining)} remaining (${percentage}%)`
    }

    const remaining = getTimeRemaining(spentMinutes, estimatedHours)
    return `${formatDuration(remaining)} remaining (${percentage}%)`
}

/**
 * Parse hours input (handles decimal and "h:m" format)
 */
export function parseHoursInput(input: string): number | null {
    if (!input || input.trim() === "") return null

    // Try parsing as decimal (e.g., "2.5")
    const decimal = Number.parseFloat(input)
    if (!Number.isNaN(decimal) && decimal > 0) {
        return decimal
    }

    // Try parsing as "h:m" format (e.g., "2:30")
    const parts = input.split(":")
    if (parts.length === 2) {
        const hours = Number.parseInt(parts[0], 10)
        const minutes = Number.parseInt(parts[1], 10)
        if (!Number.isNaN(hours) && !Number.isNaN(minutes) && hours >= 0 && minutes >= 0 && minutes < 60) {
            return hours + minutes / 60
        }
    }

    return null
}

/**
 * Calculate elapsed minutes from a start time
 */
export function getElapsedMinutes(startTime: string): number {
    const start = new Date(startTime)
    const now = new Date()
    const diff = now.getTime() - start.getTime()
    return Math.floor(diff / 60000) // Convert ms to minutes
}

/**
 * Check if time has elapsed past the estimated limit
 */
export function hasTimeElapsed(startTime: string, estimatedHours: number): boolean {
    if (!estimatedHours || estimatedHours <= 0) return false
    const elapsedMinutes = getElapsedMinutes(startTime)
    const estimatedMinutes = estimatedHours * 60
    return elapsedMinutes >= estimatedMinutes
}

/**
 * Check if warning should be shown (within 20 minutes of limit)
 */
export function shouldShowWarning(startTime: string, estimatedHours: number, warningMinutes: number = 20): boolean {
    if (!estimatedHours || estimatedHours <= 0) return false
    const elapsedMinutes = getElapsedMinutes(startTime)
    const estimatedMinutes = estimatedHours * 60
    const remainingMinutes = estimatedMinutes - elapsedMinutes
    return remainingMinutes <= warningMinutes && remainingMinutes > 0
}

/**
 * Get remaining minutes before time limit
 */
export function getRemainingMinutesFromStart(startTime: string, estimatedHours: number): number {
    if (!estimatedHours || estimatedHours <= 0) return 0
    const elapsedMinutes = getElapsedMinutes(startTime)
    const estimatedMinutes = estimatedHours * 60
    return Math.max(0, estimatedMinutes - elapsedMinutes)
}

