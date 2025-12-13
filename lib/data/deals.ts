import { createClient } from "@/lib/supabase/server"
import { Deal } from "@/lib/types"

export async function getDeals() {
    const supabase = await createClient()

    // RLS will restrict non-admins/VAs if policies are set correctly
    const { data, error } = await supabase
        .from("deals")
        .select("*, client:clients(name), project:projects(name)")
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching deals:", error)
        return []
    }

    return data as Deal[]
}

export async function getDealStats() {
    const deals = await getDeals()

    const totalValue = deals.reduce((sum, d) => sum + (d.estimated_value || 0), 0)
    const pipelineCount = deals.filter(d => d.stage !== 'Won' && d.stage !== 'Lost').length
    const wonCount = deals.filter(d => d.stage === 'Won').length

    return {
        totalValue,
        pipelineCount,
        wonCount,
        recentDeals: deals.slice(0, 5)
    }
}
