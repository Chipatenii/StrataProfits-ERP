interface TotalsRowProps {
    label: string
    value: string
    dimmed?: boolean
}

export function TotalsRow({ label, value, dimmed }: TotalsRowProps) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className={dimmed ? "text-slate-500 dark:text-slate-400" : "text-slate-700 dark:text-slate-300"}>{label}</span>
            <span className={`font-mono font-medium ${dimmed ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white"}`}>{value}</span>
        </div>
    )
}
