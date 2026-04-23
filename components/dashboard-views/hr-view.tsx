"use client"

import { useState } from "react"
import useSWR from "swr"
import { Calendar, Star, ClipboardList } from "lucide-react"
import { TimeOffTab } from "@/components/hr/time-off-tab"
import { ReviewsTab } from "@/components/hr/reviews-tab"
import { OnboardingTab } from "@/components/hr/onboarding-tab"

type HRTab = "time-off" | "reviews" | "onboarding"

const TABS: { id: HRTab; label: string; icon: React.ElementType }[] = [
    { id: "time-off", label: "Time Off", icon: Calendar },
    { id: "reviews", label: "Reviews", icon: Star },
    { id: "onboarding", label: "Onboarding", icon: ClipboardList },
]

export function HRView({ userRole }: { userRole?: string }) {
    const isAdmin = userRole === "admin"

    const fetcher = (url: string) => fetch(url).then(res => res.json())
    const { data: membersRaw = [] } = useSWR(isAdmin ? "/api/admin/members" : null, fetcher)
    const members = Array.isArray(membersRaw) ? membersRaw : []

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">HR &amp; onboarding</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {isAdmin
                        ? "Manage time-off requests, performance reviews, and onboarding checklists."
                        : "Request time off, view your reviews, and track your onboarding progress."
                    }
                </p>
            </div>

            <HRTabs isAdmin={isAdmin} members={members} />
        </div>
    )
}

function HRTabs({ isAdmin, members }: { isAdmin: boolean; members: any[] }) {
    const [activeTab, setActiveTab] = useState<HRTab>("time-off")

    return (
        <>
            <div className="flex gap-0.5 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg w-fit">
                {TABS.map(tab => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                isActive
                                    ? "bg-emerald-700 text-white"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {activeTab === "time-off" && <TimeOffTab isAdmin={isAdmin} />}
            {activeTab === "reviews" && <ReviewsTab isAdmin={isAdmin} members={members} />}
            {activeTab === "onboarding" && <OnboardingTab isAdmin={isAdmin} />}
        </>
    )
}
