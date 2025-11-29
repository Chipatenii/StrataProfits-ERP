import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

export function useTasks() {
    return useQuery({
        queryKey: ["tasks"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("tasks")
                .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey(full_name),
          creator:profiles!tasks_created_by_fkey(full_name)
        `)
                .order("created_at", { ascending: false })

            if (error) throw error
            return data
        },
    })
}

export function useMembers() {
    return useQuery({
        queryKey: ["members"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .order("full_name")

            if (error) throw error
            return data
        },
    })
}

export function useTimeLogs() {
    return useQuery({
        queryKey: ["time_logs"],
        queryFn: async () => {
            // Note: We're using the admin API route for time logs to bypass RLS if needed,
            // or we can fetch directly if the user has permission.
            // For consistency with previous implementation, let's fetch from the API route
            // which handles the admin check.
            const response = await fetch("/api/admin/time-logs")
            if (!response.ok) throw new Error("Failed to fetch time logs")
            return response.json()
        },
    })
}

export function useProfile(userId: string) {
    return useQuery({
        queryKey: ["profile", userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single()

            if (error) throw error
            return data
        },
        enabled: !!userId,
    })
}
