import type React from "react"

interface SectionHeadingProps {
    icon: React.ReactNode
    title: string
}

export function SectionHeading({ icon, title }: SectionHeadingProps) {
    return (
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <span className="text-emerald-700 dark:text-emerald-400">{icon}</span>
            {title}
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800 ml-1" />
        </div>
    )
}
