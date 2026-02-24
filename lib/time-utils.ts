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

/**
 * Get greeting based on time of day
 */
export function getTimeBasedGreeting(userName: string): string {
    const hour = new Date().getHours()
    // Safe access for firstName, default to 'User' if missing
    const firstName = userName ? userName.split(' ')[0] : 'User'

    let greeting = "Good morning"
    if (hour >= 12 && hour < 17) {
        greeting = "Good afternoon"
    } else if (hour >= 17) {
        greeting = "Good evening"
    }

    return `${greeting}, ${firstName}`
}

/**
 * Get formatted current date (e.g., "Thursday, December 18, 2025")
 */
export function getFormattedDate(): string {
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date())
}

/**
 * Get formatted current time (e.g., "15:30:45")
 */
export function getFormattedTime(): string {
    return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(new Date())
}
