"use client"

import { Home, CheckSquare, Calendar, User, MoreHorizontal, type LucideIcon } from "lucide-react"

interface MobileBottomNavProps {
    activeView: string
    onViewChange: (view: string) => void
    items?: {
        id: string
        label: string
        icon: LucideIcon
    }[]
}

const defaultItems = [
    { id: "my-day", label: "My Day", icon: Home },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "meetings", label: "Meetings", icon: Calendar },
    { id: "profile", label: "Profile", icon: User },
]

export function MobileBottomNav({ activeView, onViewChange, items = defaultItems }: MobileBottomNavProps) {
    const displayItems = items.slice(0, 4)
    const hasMore = items.length > 4

    return (
        <nav className="mobile-nav">
            <div className="flex items-center justify-around px-2">
                {displayItems.map((item) => {
                    const Icon = item.icon
                    const isActive = activeView === item.id
                    return (
                        <button
                            key={item.id}
                            onClick={() => onViewChange(item.id)}
                            className={`mobile-nav-item relative ${isActive ? "active" : ""}`}
                            aria-label={item.label}
                        >
                            <Icon
                                size={22}
                                strokeWidth={isActive ? 2.5 : 2}
                                className={`transition-all duration-200 ${isActive ? "text-emerald-700 dark:text-emerald-400 scale-110" : ""}`}
                            />
                            <span className={`text-[10px] font-medium ${isActive ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
                                {item.label}
                            </span>
                            {isActive && (
                                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-emerald-700 rounded-b-full" />
                            )}
                        </button>
                    )
                })}
                {hasMore && (
                    <button
                        onClick={() => onViewChange("more")}
                        className={`mobile-nav-item ${activeView === "more" ? "active" : ""}`}
                        aria-label="More"
                    >
                        <MoreHorizontal size={22} strokeWidth={2} />
                        <span className="text-[10px] font-medium">More</span>
                    </button>
                )}
            </div>
        </nav>
    )
}
