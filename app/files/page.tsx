import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Header } from "@/components/header"
import { FileBrowser } from "@/components/ui/file-browser"
import { Cloud } from "lucide-react"

export default async function FilesPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/auth/login")
    }

    // Role check prevents clients from accessing this via UI directly if they somehow bypass routing
    const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single()

    if (profile?.role === "client") {
        redirect("/client-portal")
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 md:pb-0 font-sans text-slate-900 dark:text-slate-100 selection:bg-indigo-500/30">
            <Header />
            <main className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in">

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Cloud className="w-5 h-5 text-indigo-500" />
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Company Drive</h1>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
                            Centralized repository for branding assets, standard operating procedures, and company-wide documentation.
                        </p>
                    </div>
                </div>

                <FileBrowser />
                
                
            </main>
        </div>
    )
}
