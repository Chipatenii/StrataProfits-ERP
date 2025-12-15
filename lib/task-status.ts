export const CANONICAL_TASK_STATUSES = {
    todo: "todo",
    in_progress: "in_progress",
    blocked: "blocked",
    in_review: "in_review",
    done: "done",
} as const

export type CanonicalTaskStatus = keyof typeof CANONICAL_TASK_STATUSES

// Legacy mapping for backward compatibility
const LEGACY_STATUS_MAP: Record<string, CanonicalTaskStatus> = {
    // Common variations
    "pending": "todo",
    "not_started": "todo",
    "active": "in_progress",
    "working": "in_progress",
    "on_hold": "blocked",
    "waiting": "blocked",
    "review": "in_review",
    "under_review": "in_review",
    "complete": "done",
    "completed": "done",
    "finished": "done",
    // Canonical (identity)
    "todo": "todo",
    "in_progress": "in_progress",
    "blocked": "blocked",
    "in_review": "in_review",
    "done": "done",
}

export function normalizeTaskStatus(status: string | null | undefined): CanonicalTaskStatus {
    if (!status) return "todo"
    const lower = status.toLowerCase().trim()
    return LEGACY_STATUS_MAP[lower] || "todo"
}

export const STATUS_LABELS: Record<CanonicalTaskStatus, string> = {
    todo: "To Do",
    in_progress: "In Progress",
    blocked: "Blocked",
    in_review: "In Review",
    done: "Done",
}

export const STATUS_COLORS: Record<CanonicalTaskStatus, string> = {
    todo: "bg-gray-100 text-gray-800",
    in_progress: "bg-blue-100 text-blue-800",
    blocked: "bg-red-100 text-red-800",
    in_review: "bg-yellow-100 text-yellow-800",
    done: "bg-green-100 text-green-800",
}
