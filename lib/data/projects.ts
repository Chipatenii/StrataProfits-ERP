import { createClient } from "@/lib/supabase/server"
import { Project } from "@/lib/types"

export async function getProjects() {
    const supabase = await createClient()

    // RLS determines visibility. 
    // Admins see all. Members see projects they are part of.
    const { data, error } = await supabase
        .from("projects")
        .select("*, client:clients(name)")
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching projects:", error)
        return []
    }

    return data as (Project & { client?: { name: string } })[]
}

export async function getProjectById(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("projects")
        .select("*, client:clients(*)")
        .eq("id", id)
        .single()

    if (error) {
        console.error(`Error fetching project ${id}:`, error)
        return null
    }

    return data as (Project & { client?: any })
}

export async function getProjectsByClientId(clientId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })

    if (error) {
        console.error(`Error fetching projects for client ${clientId}:`, error)
        return []
    }
    return data as Project[]
}

export async function getMyProjects(userId: string) {
    const supabase = await createClient()
    // If RLS is set up correctly, getProjects() already filters strictly.
    // But explicitly fetching via junction table is sometimes robust if RLS is complex.
    // However, trusting RLS is the "Postgres Way". 
    // Let's stick to getProjects() relying on RLS, but if we need explicit membership check:

    const { data, error } = await supabase
        .from("project_members")
        .select("project:projects(*)")
        .eq("user_id", userId)

    if (error) {
        console.error("Error fetching my projects", error)
        return []
    }

    // Extract projects from the join
    return data.map((pm: any) => pm.project).filter(Boolean) as Project[]
}
