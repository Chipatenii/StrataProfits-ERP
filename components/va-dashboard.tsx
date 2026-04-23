"use client"

import { getNavItemsForRole } from "@/lib/navigation"
import { useState, useCallback, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription"
import { VAOverview } from "@/components/dashboard-views/va-overview"
import { VAFinance } from "@/components/dashboard-views/va-finance"
import { VASOPs } from "@/components/dashboard-views/va-sops"
import { PipelineView } from "@/components/dashboard-views/pipeline-view"
import { ProjectListView } from "@/components/projects/project-list-view"
import { ProjectDetailView } from "@/components/projects/project-detail-view"
import { DailyCheckInView } from "@/components/dashboard-views/daily-checkin-view"
import { TeamTasksView } from "@/components/dashboard-views/team-tasks-view"
import { MeetingsView } from "@/components/dashboard-views/meetings-view"
import { ClientsView } from "@/components/dashboard-views/clients-view"
import { SalesView } from "@/components/dashboard-views/sales-view"
import { FilesView } from "@/components/dashboard-views/files-view"
import { HRView } from "@/components/dashboard-views/hr-view"
import { TeamPerformanceView } from "@/components/dashboard-views/team-performance-view"
import { UserProfile } from "@/lib/types"
import { DashboardShell } from "./dashboard-shell"
import { Home, CheckSquare, Calendar, FolderKanban } from "lucide-react"

interface VADashboardProps {
  userId: string
  userName: string
  userEmail: string
  userRole: string
}

type View = "overview" | "tasks" | "meetings" | "pipeline" | "projects" | "finance" | "sops" | "clients" | "sales" | "files" | "hr" | "checkins" | "performance"

export function VADashboard({ userId, userName, userEmail, userRole }: VADashboardProps) {
  const supabase = createClient()
  const [activeView, setActiveView] = useState<View>("overview")
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const resProfile = await fetch("/api/profile")
      if (resProfile.ok) {
        const profileData = await resProfile.json()
        setProfile(profileData)
      }
      setLoading(false)
    } catch (error) {
      console.error("Error loading data:", error)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Real-time subscriptions (previously missing)
  useRealtimeSubscription("tasks", loadData)
  useRealtimeSubscription("time_logs", loadData)

  // Polling safety net (see admin-dashboard) — catches drops in the
  // realtime channel so the dashboard doesn't show stale data.
  useEffect(() => {
    const id = setInterval(() => { loadData() }, 90_000)
    return () => clearInterval(id)
  }, [loadData])

  const menuItems = useMemo(
    () => getNavItemsForRole(userRole as UserProfile["role"]),
    [userRole]
  )

  // Mobile nav (previously missing)
  const mobileNavItems = [
    { id: "overview", label: "Home", icon: Home },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "meetings", label: "Meetings", icon: Calendar },
    { id: "projects", label: "Projects", icon: FolderKanban },
  ]

  return (
    <DashboardShell
      userId={userId}
      userName={userName}
      userRole={userRole}
      profile={profile}
      brandLabel="Virtual Assistant"
      brandInitials="VA"
      menuItems={menuItems}
      activeView={activeView}
      onViewChange={(view) => {
        setActiveView(view as View)
        if (view !== "projects") setSelectedProjectId(null)
      }}
      mobileNavItems={mobileNavItems}
      loading={loading}
      isAdmin={false}
    >
      {activeView === "overview" && (
        <VAOverview userId={userId} userName={userName} onViewChange={(view) => setActiveView(view as View)} />
      )}
      {activeView === "clients" && <ClientsView />}
      {activeView === "sales" && <SalesView />}
      {activeView === "tasks" && (
        <TeamTasksView userId={userId} userName={userName} onDataChange={loadData} />
      )}
      {activeView === "meetings" && <MeetingsView />}
      {activeView === "pipeline" && <PipelineView />}
      {activeView === "projects" && (
        selectedProjectId ? (
          <ProjectDetailView projectId={selectedProjectId} onBack={() => setSelectedProjectId(null)} />
        ) : (
          <ProjectListView userId={userId} onSelectProject={setSelectedProjectId} />
        )
      )}
      {activeView === "finance" && <VAFinance userName={userName} userRole={userRole} />}
      {activeView === "sops" && <VASOPs />}
      {activeView === "checkins" && <DailyCheckInView userId={userId} userName={userName} />}
      {activeView === "files" && <FilesView />}
      {activeView === "hr" && <HRView />}
      {activeView === "performance" && <TeamPerformanceView />}
    </DashboardShell>
  )
}
