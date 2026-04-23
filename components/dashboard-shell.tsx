"use client"

import { APP_NAME } from "@/lib/config"
import { useState, useCallback, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
    LogOut,
    Settings,
    Menu,
    X,
    Loader2,
} from "lucide-react"
import { UserProfileCard } from "./user-profile-card"
import { ProfileSettingsModal } from "./profile-settings-modal"
import { NotificationBell } from "./notification-bell"
import { ThemeToggle } from "./theme-toggle"
import { MobileBottomNav } from "./mobile-bottom-nav"
import { getTimeBasedGreeting, getFormattedDate } from "@/lib/time-utils"
import type { LucideIcon } from "lucide-react"
import type { UserProfile } from "@/lib/types"

export interface DashboardNavItem {
    id: string
    label: string
    icon: LucideIcon
    badge?: number
}

export interface DashboardShellProps {
    userId: string
    userName: string
    userRole: string
    profile: UserProfile | null

    /** Branding shown in the sidebar header */
    brandLabel: string
    brandInitials: string

    /** Navigation */
    menuItems: DashboardNavItem[]
    activeView: string
    onViewChange: (view: string) => void

    /** Mobile bottom nav items (up to 4) */
    mobileNavItems?: { id: string; label: string; icon: LucideIcon }[]

    /** Optional sidebar widgets (timer, stats, etc.) rendered above nav */
    sidebarWidgets?: ReactNode

    /** Whether to show loading spinner instead of content */
    loading?: boolean

    /** Whether the user is admin (for settings modal and notification bell) */
    isAdmin?: boolean

    /** Main content */
    children: ReactNode
}

export function DashboardShell({
    userId,
    userName,
    userRole,
    profile,
    brandLabel,
    brandInitials,
    menuItems,
    activeView,
    onViewChange,
    mobileNavItems,
    sidebarWidgets,
    loading = false,
    isAdmin = false,
    children,
}: DashboardShellProps) {
    const supabase = createClient()
    const router = useRouter()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [showProfileSettings, setShowProfileSettings] = useState(false)

    const handleLogout = useCallback(async () => {
        await supabase.auth.signOut()
        router.push("/auth/login")
    }, [supabase, router])

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-emerald-700 animate-spin" />
                    <p className="text-sm text-slate-500">Loading dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 z-[55] md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* ═══ Sidebar (QuickBooks-style: clean white with emerald accents) ═══ */}
            {/* On mobile, sidebar uses z-[60] to stack above the mobile bottom nav (z-50),
                otherwise the Sign Out button at the bottom is covered and untappable. */}
            <div className={`
                fixed md:relative z-[60] md:z-auto h-full
                transition-[width,transform] duration-200 ease-out
                bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col
                ${isSidebarOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0 md:w-20 lg:w-72"}
            `}>
                {/* Clean Branded Header */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
                    <div className={`flex items-center gap-3 ${!isSidebarOpen && "md:hidden lg:flex"}`}>
                        <div className="w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold text-base">
                            {brandInitials}
                        </div>
                        <div>
                            <h2 className="font-semibold text-[15px] text-slate-900 dark:text-white leading-tight">{brandLabel}</h2>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">StrataForge Suite</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg md:hidden transition-colors text-slate-600 dark:text-slate-300"
                        aria-label="Close sidebar"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
                    {/* Optional Sidebar Widgets (timer, stats) */}
                    {sidebarWidgets && <div className="mb-2">{sidebarWidgets}</div>}

                    {/* Nav Items */}
                    {menuItems.map((item) => {
                        const Icon = item.icon
                        const isActive = activeView === item.id
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    onViewChange(item.id)
                                    if (typeof window !== "undefined" && window.innerWidth < 768) setIsSidebarOpen(false)
                                }}
                                className={`sidebar-icon-btn group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors min-h-[40px] text-sm
                                    ${isActive
                                        ? "bg-emerald-50 text-emerald-700 font-semibold dark:bg-emerald-900/30 dark:text-emerald-300"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                                    }`}
                                title={item.label}
                            >
                                <Icon
                                    size={18}
                                    strokeWidth={isActive ? 2.25 : 1.75}
                                    data-tooltip={item.label}
                                    className="shrink-0"
                                />
                                <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"} flex-1 text-left`}>
                                    {item.label}
                                </span>

                                {item.badge !== undefined && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-auto
                                        ${isActive
                                            ? 'bg-emerald-700 text-white'
                                            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                                        } ${!isSidebarOpen && "md:hidden lg:block"}`}>
                                        {item.badge}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </nav>

                <div className="p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-200 dark:border-slate-800 space-y-0.5">
                    <button
                        onClick={() => setShowProfileSettings(true)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors min-h-[40px] text-sm"
                        title="Settings"
                    >
                        <Settings size={18} className="shrink-0" strokeWidth={1.75} />
                        <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"} font-medium`}>Settings</span>
                    </button>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors min-h-[40px] text-sm"
                        title="Sign Out"
                    >
                        <LogOut size={18} className="shrink-0" strokeWidth={1.75} />
                        <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"} font-medium`}>Sign Out</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
                {/* Header */}
                <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 flex-shrink-0 z-30">
                    <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg md:hidden text-slate-700 dark:text-slate-200 transition-colors"
                                aria-label="Open sidebar"
                            >
                                <Menu size={22} />
                            </button>

                            <div className="flex flex-col min-w-0">
                                <h1 className="text-base md:text-lg font-semibold text-slate-900 dark:text-white leading-tight truncate">
                                    {APP_NAME}
                                </h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 hidden md:block">
                                    Welcome back, <span className="font-medium text-slate-700 dark:text-slate-200">{userName}</span> · <span className="text-emerald-700 dark:text-emerald-400 font-medium">{getFormattedDate()}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 md:gap-2">
                            <ThemeToggle />
                            <NotificationBell userId={userId} isAdmin={isAdmin} />
                            <div className="flex-shrink-0 hidden sm:block">
                                {profile && (
                                    <UserProfileCard
                                        fullName={profile.full_name}
                                        email={profile.email}
                                        role={profile.role}
                                        avatarUrl={profile.avatar_url || undefined}
                                        compact={true}
                                        userId={profile.id}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Area.
                    pb-[calc(5rem+env(safe-area-inset-bottom))] reserves space for the
                    mobile bottom nav (~60px) plus iOS home-indicator safe area,
                    so content never tucks under the nav. */}
                <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 w-full relative pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
                    <div className="md:hidden mb-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {getTimeBasedGreeting(userName)}
                        </p>
                    </div>

                    {children}
                </main>

                {/* Mobile Bottom Nav */}
                {mobileNavItems && mobileNavItems.length > 0 && (
                    <MobileBottomNav
                        activeView={activeView}
                        onViewChange={onViewChange}
                        items={mobileNavItems}
                    />
                )}

                {/* Profile Settings Modal */}
                {showProfileSettings && (
                    <ProfileSettingsModal
                        userId={userId}
                        isAdmin={isAdmin}
                        initialProfile={profile}
                        onClose={() => setShowProfileSettings(false)}
                        onSuccess={() => setShowProfileSettings(false)}
                    />
                )}
            </div>
        </div>
    )
}
