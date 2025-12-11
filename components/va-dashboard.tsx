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
import { TasksView } from "@/components/dashboard-views/tasks-view"
import { MeetingsView } from "@/components/dashboard-views/meetings-view"
import { UserProfileCard } from "./user-profile-card"

interface VADashboardProps {

interface VADashboardProps {
    userId: string
    userName: string
}

type View = 'overview' | 'tasks' | 'meetings' | 'pipeline' | 'projects' | 'finance' | 'sops'

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
        { id: 'tasks', label: 'Tasks', icon: FolderKanban },
        { id: 'meetings', label: 'Meetings', icon: FolderKanban }, // Use correct icon if available
        { id: 'pipeline', label: 'Sales Pipeline', icon: DollarSign },
        </div >
    )
}
