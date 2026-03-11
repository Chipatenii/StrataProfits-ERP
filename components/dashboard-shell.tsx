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
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen bg-background relative overflow-hidden">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* ═══ Sidebar ═══ */}
            <div className={`
                fixed md:relative z-50 h-full
                transition-all duration-300 ease-out
                bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl md:shadow-xl flex flex-col
                ${isSidebarOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0 md:w-20 lg:w-72"}
            `}>
                {/* Premium Branded Header */}
                <div className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.15)_0%,_transparent_50%)]" />
                    <div className="relative p-4 flex items-center justify-between h-20">
                        <div className={`flex items-center gap-3 ${!isSidebarOpen && "md:hidden lg:flex"}`}>
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg border border-white/30 shadow-lg">
                                {brandInitials}
                            </div>
                            <div className="text-white">
                                <h2 className="font-bold text-lg leading-tight">{brandLabel}</h2>
                                <p className="text-xs text-white/70">StrataForge Business Suite</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="p-2.5 hover:bg-white/20 rounded-xl md:hidden transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {/* Optional Sidebar Widgets (timer, stats) */}
                    {sidebarWidgets}

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
                                className={`sidebar-icon-btn group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 min-h-[48px]
                                    ${isActive
                                        ? "bg-primary/10 text-primary font-semibold shadow-sm dark:bg-primary/20"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                                title={item.label}
                            >
                                <Icon
                                    size={20}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    data-tooltip={item.label}
                                    className={`shrink-0 transition-colors ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
                                />
                                <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"} transition-opacity duration-200 flex-1 text-left text-sm`}>
                                    {item.label}
                                </span>

                                {item.badge !== undefined && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto
                                        ${isActive
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground'
                                        } ${!isSidebarOpen && "md:hidden lg:block"}`}>
                                        {item.badge}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-border space-y-1">
                    <button
                        onClick={() => setShowProfileSettings(true)}
                        className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 min-h-[48px]"
                        title="Settings"
                    >
                        <Settings size={20} className="shrink-0 transition-colors" />
                        <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"} text-sm font-medium`}>Settings</span>
                    </button>
                    <button
                        onClick={handleLogout}
                        className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 transition-all duration-200 min-h-[48px]"
                        title="Sign Out"
                    >
                        <LogOut size={20} className="shrink-0 transition-colors" />
                        <span className={`whitespace-nowrap ${!isSidebarOpen && "md:hidden lg:block"} text-sm font-medium`}>Sign Out</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
                {/* Header */}
                <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-lg shadow-black/5 dark:shadow-black/20 h-18 flex-shrink-0 z-30">
                    <div className="h-full px-4 md:px-6 py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="p-2.5 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl md:hidden text-foreground transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                            >
                                <Menu size={22} />
                            </button>

                            <div className="flex flex-col">
                                <h1 className="text-lg md:text-xl font-bold text-foreground leading-tight truncate">
                                    {APP_NAME}
                                </h1>
                                <p className="text-xs text-muted-foreground hidden md:block">
                                    Welcome back, <span className="font-medium text-foreground">{userName}</span> • <span className="text-primary font-medium">{getFormattedDate()}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:gap-3">
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

                {/* Content Area */}
                <main className="flex-1 overflow-auto p-4 md:p-6 w-full relative pb-24 md:pb-6">
                    <div className="md:hidden mb-4">
                        <p className="text-sm text-muted-foreground">
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
