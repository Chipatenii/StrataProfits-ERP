import { Cloud } from "lucide-react"
import { FileBrowser } from "@/components/ui/file-browser"

export function FilesView() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
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
        </div>
    )
}
