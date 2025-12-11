"use client"

import { useState } from "react"
import {
    LayoutDashboard,
    DollarSign,
    FolderKanban,
    FileText,
    Book,
    LogOut,
    Menu,
    X,
    Sun
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

import { VAOverview } from "@/components/dashboard-views/va-overview"
import { VAFinance } from "@/components/dashboard-views/va-finance"
import { VASOPs } from "@/components/dashboard-views/va-sops"
import { PipelineView } from "@/components/dashboard-views/pipeline-view"
import { ProjectListView } from "@/components/projects/project-list-view"
import { UserProfileCard } from "./user-profile-card"

interface VADashboardProps {
    userId: string
    userName: string
}

type View = 'overview' | 'pipeline' | 'projects' | 'finance' | 'sops'

export function VADashboard({ userId, userName }: VADashboardProps) {
    const [activeView, setActiveView] = useState<View>('overview')
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push("/auth/login")
    }

    const menuItems = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'pipeline', label: 'Sales Pipeline', icon: DollarSign },
        { id: 'projects', label: 'Projects', icon: FolderKanban }, // Needs Projects View
        { id: 'finance', label: 'Finance', icon: FileText },
        { id: 'sops', label: 'SOPs & Wiki', icon: Book },
    ]

    return (
        <div className="min-h-screen bg-transparent flex">
            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-white/80 backdrop-blur-xl border-r border-white/20 shadow-xl transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
                ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
            `}>
                <div className="h-full flex flex-col p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            Ostento Ops
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-black/5 rounded-full">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <nav className="flex-1 space-y-2">
                        {menuItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => { setActiveView(item.id as View); setIsSidebarOpen(false) }}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                                    ${activeView === item.id
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 font-medium"
                                        : "text-muted-foreground hover:bg-white/50 hover:text-foreground"
                                    }
                                `}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    <div className="mt-auto pt-6 border-t border-border/50 space-y-4">
                        <UserProfileCard
                            fullName={userName}
                            email="Virtual Assistant"
                            role="virtual_assistant"
                        />
                        <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-red-500 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 overflow-auto">
                <div className="p-4 lg:hidden">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-white/50 backdrop-blur-md rounded-lg shadow-sm">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>

                <div className="max-w-7xl mx-auto px-6 py-8">
                    {activeView === 'overview' && <VAOverview userName={userName} userId={userId} />}
                    {activeView === 'pipeline' && <PipelineView />}
                    {activeView === 'projects' && <ProjectListView />}
                    {activeView === 'finance' && <VAFinance />}
                    {activeView === 'sops' && <VASOPs />}
                </div>
            </main>
        </div>
    )
}
