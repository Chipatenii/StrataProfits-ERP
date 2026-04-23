import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Header } from "@/components/header"
import { Cloud } from "lucide-react"
import { FilesTabs } from "@/components/files-tabs"

export default async function FilesPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/auth/login")
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single()

    if (profile?.role === "client") {
        redirect("/client-portal")
    }

    const isAdmin = profile?.role === "admin"

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 md:pb-0 font-sans text-slate-900 dark:text-slate-100 selection:bg-emerald-500/30">
            <Header />
            <main className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                            <Cloud className="w-3.5 h-3.5" />
                            Company Drive
                        </div>
                        <h1 className="mt-1 text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">
                            Files
                        </h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                            Centralized repository for branding assets, standard operating procedures, and company-wide documentation.
                        </p>
                    </div>
                </div>

                <FilesTabs isAdmin={isAdmin} />
            </main>
        </div>
    )
}
