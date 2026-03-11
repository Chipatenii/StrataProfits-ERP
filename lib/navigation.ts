import { LucideIcon, LayoutDashboard, Users, FolderKanban, FileText, DollarSign, Receipt, Book, ClipboardCheck, Sun, Cloud, Briefcase, Activity, MessageSquare } from "lucide-react"
import { Permission, hasPermission } from "./permissions"
import { UserProfile } from "./types"

export interface NavItem {
    id: string
    label: string
    icon: LucideIcon
    requiredPermission?: Permission
}

export const ALL_NAV_ITEMS: NavItem[] = [
    { id: "my-day", label: "My Day", icon: Sun, requiredPermission: "dashboard:my_day" },
    { id: "overview", label: "Overview", icon: LayoutDashboard, requiredPermission: "reports:read" },
    { id: "clients", label: "Clients", icon: Users, requiredPermission: "clients:read" },
    { id: "sales", label: "Sales", icon: Receipt, requiredPermission: "invoices:read" }, // Consolidation of Invoices, Quotes, Payments, & Pipeline
    { id: "projects", label: "Projects", icon: FolderKanban, requiredPermission: "projects:read" },
    { id: "tasks", label: "Tasks", icon: ClipboardCheck, requiredPermission: "tasks:read" },
    { id: "checkins", label: "Check-ins", icon: MessageSquare, requiredPermission: "tasks:read" },
    { id: "finance", label: "Finance", icon: DollarSign, requiredPermission: "reports:finance" }, // Includes Expenses
    { id: "reports", label: "Reports", icon: LayoutDashboard, requiredPermission: "reports:finance" },
    { id: "files", label: "Drive", icon: Cloud, requiredPermission: "files:read" },
    { id: "hr", label: "HR", icon: Briefcase, requiredPermission: "hr:read" },
    { id: "meetings", label: "Meetings", icon: FileText, requiredPermission: "meetings:read" },
    { id: "sops", label: "SOPs", icon: Book, requiredPermission: "sops:read" },
    { id: "team", label: "Team", icon: Users, requiredPermission: "users:read" },
    { id: "performance", label: "Performance", icon: Activity, requiredPermission: "reports:read" },
]

export function getNavItemsForRole(role: UserProfile["role"]): NavItem[] {
    return ALL_NAV_ITEMS.filter(item =>
        !item.requiredPermission || hasPermission(role, item.requiredPermission)
    )
}
