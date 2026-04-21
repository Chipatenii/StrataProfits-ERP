import { FileBrowser } from "@/components/ui/file-browser"

export function FilesView() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">Company drive</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Centralized repository for branding assets, standard operating procedures, and company-wide documentation.
                </p>
            </div>

            <FileBrowser />
        </div>
    )
}
