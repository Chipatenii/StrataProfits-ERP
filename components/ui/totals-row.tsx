interface TotalsRowProps {
    label: string
    value: string
    dimmed?: boolean
}

export function TotalsRow({ label, value, dimmed }: TotalsRowProps) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className={dimmed ? "text-muted-foreground" : "text-foreground/80"}>{label}</span>
            <span className={`tabular-nums font-medium ${dimmed ? "text-muted-foreground" : ""}`}>{value}</span>
        </div>
    )
}
