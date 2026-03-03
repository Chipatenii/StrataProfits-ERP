"use client"

import { useState, useEffect, useCallback } from "react"
import { Briefcase, Calendar, Star, ClipboardList } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { TimeOffTab } from "@/components/hr/time-off-tab"
import { ReviewsTab } from "@/components/hr/reviews-tab"
import { OnboardingTab } from "@/components/hr/onboarding-tab"
import { UserProfile } from "@/lib/types"

type HRTab = "time-off" | "reviews" | "onboarding"

const TABS: { id: HRTab; label: string; icon: any }[] = [
    { id: "time-off", label: "Time Off", icon: Calendar },
    { id: "reviews", label: "Reviews", icon: Star },
    { id: "onboarding", label: "Onboarding", icon: ClipboardList },
]

export function HRView() {
    const supabase = createClient()
    const [activeTab, setActiveTab] = useState<HRTab>("time-off")
    const [isAdmin, setIsAdmin] = useState(false)
    const [members, setMembers] = useState<UserProfile[]>([])

    useEffect(() => {
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single()

            setIsAdmin(profile?.role === "admin")

            // Admins need the members list for performance reviews
            if (profile?.role === "admin") {
                const res = await fetch("/api/admin/members")
                if (res.ok) {
                    const data = await res.json()
                    setMembers(Array.isArray(data) ? data : [])
                }
            }
        }
        load()
    }, [supabase])

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-3xl bg-primary p-8 md:p-10 text-white shadow-2xl shadow-primary/30">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <Briefcase className="w-5 h-5 text-rose-200" />
                        <span className="text-sm font-medium text-rose-100 uppercase tracking-wider">Human Resources</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">HR & Onboarding</h1>
                    <p className="text-rose-100/80 text-lg">
                        {isAdmin
                            ? "Manage time-off requests, write performance reviews, and configure onboarding checklists"
                            : "Request time off, view your reviews, and track your onboarding progress"
                        }
                    </p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-fit">
                {TABS.map(tab => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                isActive
                                    ? "bg-white dark:bg-slate-900 text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Tab Content */}
            {activeTab === "time-off" && <TimeOffTab isAdmin={isAdmin} />}
            {activeTab === "reviews" && <ReviewsTab isAdmin={isAdmin} members={members} />}
            {activeTab === "onboarding" && <OnboardingTab isAdmin={isAdmin} />}
        </div>
    )
}
