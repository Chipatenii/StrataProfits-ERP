import type React from "react"

interface SectionHeadingProps {
    icon: React.ReactNode
    title: string
}

export function SectionHeading({ icon, title }: SectionHeadingProps) {
    return (
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground/70">
            <span className="text-primary">{icon}</span>
            {title}
            <div className="flex-1 h-px bg-border/50 ml-1" />
        </div>
    )
}
