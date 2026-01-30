/**
 * Role Badge Styling Utilities
 * 
 * Provides consistent, role-specific styling for role badges throughout the application.
 * Follows the Corporate Blue design system with distinct, professional colors per role.
 */

import { UserProfile } from "@/lib/types"

type RoleType = UserProfile["role"]

interface RoleBadgeStyles {
    badge: string
    text: string
    icon?: string
}

/**
 * Returns Tailwind classes for role-specific badge styling
 */
export function getRoleBadgeStyles(role: RoleType | string): RoleBadgeStyles {
    const normalizedRole = role?.toLowerCase().trim()

    switch (normalizedRole) {
        case "admin":
            return {
                badge: "bg-purple-100 text-purple-800 border border-purple-200",
                text: "text-purple-800",
            }
        case "virtual_assistant":
            return {
                badge: "bg-blue-100 text-blue-800 border border-blue-200",
                text: "text-blue-800",
            }
        case "developer":
            return {
                badge: "bg-slate-100 text-slate-800 border border-slate-200",
                text: "text-slate-800",
            }
        case "book_keeper":
            return {
                badge: "bg-emerald-100 text-emerald-800 border border-emerald-200",
                text: "text-emerald-800",
            }
        case "social_media_manager":
            return {
                badge: "bg-pink-100 text-pink-800 border border-pink-200",
                text: "text-pink-800",
            }
        case "marketing":
            return {
                badge: "bg-indigo-100 text-indigo-800 border border-indigo-200",
                text: "text-indigo-800",
            }
        case "sales":
            return {
                badge: "bg-cyan-100 text-cyan-800 border border-cyan-200",
                text: "text-cyan-800",
            }
        case "team_member":
        default:
            return {
                badge: "bg-gray-100 text-gray-800 border border-gray-200",
                text: "text-gray-800",
            }
    }
}

/**
 * Formats role name for display (converts snake_case to Title Case)
 */
export function formatRoleName(role: string): string {
    return (role || "member")
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
}
