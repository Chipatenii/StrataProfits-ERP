import { UserProfile } from "./types"

export type Permission =
    | "clients:read" | "clients:write"
    | "deals:read" | "deals:write"
    | "quotes:read" | "quotes:write" | "quotes:send" | "quotes:accept"
    | "projects:read" | "projects:write"
    | "tasks:read" | "tasks:write" | "tasks:approve"
    | "time_logs:read" | "time_logs:write" | "time_logs:approve"
    | "invoices:read" | "invoices:write" | "invoices:send" | "invoices:mark_paid"
    | "payments:read" | "payments:write"
    | "expenses:read" | "expenses:write" | "expenses:approve"
    | "meetings:read" | "meetings:write" | "meetings:approve"
    | "sops:read" | "sops:write"
    | "reports:read" | "reports:finance"
    | "audit:read"
    | "users:read" | "users:write"
    | "dashboard:my_day"

const ROLE_PERMISSIONS: Record<UserProfile["role"], Permission[]> = {
    admin: [
        "clients:read", "clients:write",
        "deals:read", "deals:write",
        "quotes:read", "quotes:write", "quotes:send", "quotes:accept",
        "projects:read", "projects:write",
        "tasks:read", "tasks:write", "tasks:approve",
        "time_logs:read", "time_logs:write", "time_logs:approve",
        "invoices:read", "invoices:write", "invoices:send", "invoices:mark_paid",
        "payments:read", "payments:write",
        "expenses:read", "expenses:write", "expenses:approve",
        "meetings:read", "meetings:write", "meetings:approve",
        "sops:read", "sops:write",
        "reports:read", "reports:finance",
        "audit:read",
        "users:read", "users:write",
    ],
    book_keeper: [
        "clients:read",
        "deals:read",
        "quotes:read",
        "projects:read",
        "invoices:read", "invoices:write", "invoices:send", "invoices:mark_paid",
        "payments:read", "payments:write",
        "expenses:read", "expenses:write", "expenses:approve",
        "reports:read", "reports:finance",
    ],
    virtual_assistant: [
        "reports:read",
        "clients:read", "clients:write",
        "deals:read", "deals:write",
        "quotes:read", "quotes:write", "quotes:send",
        "projects:read",
        "tasks:read",
        "meetings:read", "meetings:write",
        "invoices:read", "invoices:send", // Can send reminders, cannot mark paid
        "sops:read", "sops:write",
    ],
    team_member: [
        "tasks:read", "tasks:write", // Own tasks
        "time_logs:read", "time_logs:write", // Own logs
        "meetings:read", // Own meetings
        "dashboard:my_day",
    ],
    developer: [
        "projects:read",
        "tasks:read", "tasks:write",
        "time_logs:read", "time_logs:write",
        "meetings:read",
        "sops:read",
        "dashboard:my_day",
    ],
    social_media_manager: [
        "projects:read",
        "tasks:read", "tasks:write",
        "time_logs:read", "time_logs:write",
        "meetings:read",
        "sops:read",
        "dashboard:my_day",
    ],
}

export function hasPermission(role: UserProfile["role"], permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function getPermissions(role: UserProfile["role"]): Permission[] {
    return ROLE_PERMISSIONS[role] ?? []
}

export function canAccessModule(role: UserProfile["role"], module: string): boolean {
    const modulePermissionMap: Record<string, Permission> = {
        clients: "clients:read",
        deals: "deals:read",
        quotes: "quotes:read",
        projects: "projects:read",
        tasks: "tasks:read",
        invoices: "invoices:read",
        payments: "payments:read",
        expenses: "expenses:read",
        meetings: "meetings:read",
        sops: "sops:read",
        reports: "reports:read",
        finance: "reports:finance",
        audit: "audit:read",
        users: "users:read",
    }
    const perm = modulePermissionMap[module]
    return perm ? hasPermission(role, perm) : false
}
