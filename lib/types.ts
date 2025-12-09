export interface Project {
    id: string
    name: string
    description: string | null
    status: "active" | "archived" | "completed"
    created_at: string
    updated_at: string
}

export interface ProjectMember {
    id: string
    project_id: string
    user_id: string
    role: "manager" | "member" | "viewer"
    joined_at: string
}

export interface Task {
    id: string
    title: string
    description: string | null
    status: string
    priority: "low" | "medium" | "high"
    due_date: string | null
    estimated_hours: number | null
    assigned_to: string | null
    project_id: string | null
    created_by: string
    created_at: string
    completed_at?: string | null
    completion_notes?: string | null
}

export interface UserProfile {
    id: string
    full_name: string
    email: string
    role: "admin" | "team_member"
    user_id?: string // For backward compatibility if needed, though id usually equals auth.uid
    hourly_rate?: number | null
    avatar_url?: string | null
}
