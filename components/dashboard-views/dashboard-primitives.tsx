"use client"

import { ReactNode } from "react"
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"

/**
 * Shared primitives for dashboard views.
 *
 * These are intentionally dependency-light — just tailwind classes — so future
 * dashboards (VA, team, client portal) can reuse the same visual vocabulary.
 */

type Tone = "emerald" | "blue" | "amber" | "rose" | "violet" | "slate"

const TONE_MAP: Record<Tone, { iconBg: string; badgeBg: string; text: string }> = {
    emerald: {
        iconBg: "bg-emerald-600 text-white",
        badgeBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        text: "text-emerald-700 dark:text-emerald-400",
    },
    blue: {
        iconBg: "bg-blue-600 text-white",
        badgeBg: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
        text: "text-blue-700 dark:text-blue-400",
    },
    amber: {
        iconBg: "bg-amber-500 text-white",
        badgeBg: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        text: "text-amber-700 dark:text-amber-400",
    },
    rose: {
        iconBg: "bg-rose-600 text-white",
        badgeBg: "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
        text: "text-rose-700 dark:text-rose-400",
    },
    violet: {
        iconBg: "bg-violet-600 text-white",
        badgeBg: "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
        text: "text-violet-700 dark:text-violet-400",
    },
    slate: {
        iconBg: "bg-slate-600 text-white",
        badgeBg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
        text: "text-slate-700 dark:text-slate-300",
    },
}

/* ──────────────────────────────────────────────────────────────────────────
 * KPI card — hero-strip stat. Works in 2/3/4-col grids and shrinks cleanly
 * on mobile.
 * ────────────────────────────────────────────────────────────────────────── */
export function KpiCard({
    label,
    value,
    icon,
    tone = "slate",
    subtext,
    trend,
    onClick,
}: {
    label: string
    value: string
    icon?: ReactNode
    tone?: Tone
    subtext?: string
    trend?: { value: string; direction: "up" | "down" | "flat" }
    onClick?: () => void
}) {
    const t = TONE_MAP[tone]
    const baseClass = `bg-white dark:bg-slate-900 rounded-xl p-4 md:p-5 border border-slate-200 dark:border-slate-800 text-left w-full transition-colors ${
        onClick ? "hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer" : ""
    }`
    const content = (
        <>
            <div className="flex items-start justify-between gap-2 mb-3">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide leading-tight">
                    {label}
                </p>
                {icon && (
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.iconBg}`}>
                        {icon}
                    </div>
                )}
            </div>
            <p className="text-2xl md:text-[26px] font-bold text-slate-900 dark:text-white leading-tight break-all">
                {value}
            </p>
            {(subtext || trend) && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {trend && (
                        <span
                            className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
                                trend.direction === "up"
                                    ? "text-emerald-700 dark:text-emerald-400"
                                    : trend.direction === "down"
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-slate-500 dark:text-slate-400"
                            }`}
                        >
                            {trend.direction === "up" ? (
                                <ArrowUpRight className="w-3 h-3" />
                            ) : trend.direction === "down" ? (
                                <ArrowDownRight className="w-3 h-3" />
                            ) : (
                                <Minus className="w-3 h-3" />
                            )}
                            {trend.value}
                        </span>
                    )}
                    {subtext && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{subtext}</span>
                    )}
                </div>
            )}
        </>
    )
    return onClick ? (
        <button onClick={onClick} className={baseClass}>
            {content}
        </button>
    ) : (
        <div className={baseClass}>{content}</div>
    )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Money bar — QuickBooks signature "Paid / Overdue / Not due yet" segmented
 * progress bar. Ratios computed from the three amounts.
 * ────────────────────────────────────────────────────────────────────────── */
export function MoneyBar({
    paid,
    overdue,
    notDue,
    currency = "ZMW",
}: {
    paid: number
    overdue: number
    notDue: number
    currency?: string
}) {
    const total = Math.max(paid + overdue + notDue, 1)
    const pctPaid = (paid / total) * 100
    const pctOverdue = (overdue / total) * 100
    const pctNotDue = (notDue / total) * 100

    const fmt = (n: number) => `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                <h3 className="font-semibold text-base text-slate-900 dark:text-white">Accounts receivable</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Money collected and owed</p>
            </div>

            {/* Segmented bar */}
            <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                {pctPaid > 0 && (
                    <div
                        className="bg-emerald-600 h-full"
                        style={{ width: `${pctPaid}%` }}
                        title={`Paid: ${fmt(paid)}`}
                    />
                )}
                {pctOverdue > 0 && (
                    <div
                        className="bg-rose-500 h-full"
                        style={{ width: `${pctOverdue}%` }}
                        title={`Overdue: ${fmt(overdue)}`}
                    />
                )}
                {pctNotDue > 0 && (
                    <div
                        className="bg-amber-400 h-full"
                        style={{ width: `${pctNotDue}%` }}
                        title={`Not due: ${fmt(notDue)}`}
                    />
                )}
            </div>

            {/* Legend */}
            <div className="mt-4 grid grid-cols-3 gap-3 md:gap-6">
                <LegendItem dotClass="bg-emerald-600" label="Paid" value={fmt(paid)} />
                <LegendItem dotClass="bg-rose-500" label="Overdue" value={fmt(overdue)} accent="rose" />
                <LegendItem dotClass="bg-amber-400" label="Not due yet" value={fmt(notDue)} />
            </div>
        </div>
    )
}

function LegendItem({
    dotClass,
    label,
    value,
    accent,
}: {
    dotClass: string
    label: string
    value: string
    accent?: "rose"
}) {
    return (
        <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {label}
                </span>
            </div>
            <p
                className={`font-semibold text-sm md:text-base truncate ${
                    accent === "rose" ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
                }`}
            >
                {value}
            </p>
        </div>
    )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Panel — reusable section card with title + optional action slot.
 * Used for "Team overview", "Top performer", recent activity, etc.
 * ────────────────────────────────────────────────────────────────────────── */
export function DashboardPanel({
    title,
    icon,
    iconTone = "slate",
    action,
    children,
    className = "",
}: {
    title: string
    icon?: ReactNode
    iconTone?: Tone
    action?: ReactNode
    children: ReactNode
    className?: string
}) {
    const t = TONE_MAP[iconTone]
    return (
        <div
            className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col ${className}`}
        >
            <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                    {icon && (
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${t.badgeBg}`}>
                            {icon}
                        </div>
                    )}
                    <h3 className="font-semibold text-[15px] text-slate-900 dark:text-white truncate">{title}</h3>
                </div>
                {action}
            </div>
            <div className="p-5 flex-1">{children}</div>
        </div>
    )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Skeleton placeholder. Replaces "0"/"—" flashes while SWR fetches.
 * ────────────────────────────────────────────────────────────────────────── */
export function DashboardSkeleton({ rows = 4 }: { rows?: number }) {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-xl bg-slate-100 dark:bg-slate-800" />
                ))}
            </div>
            <div className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 h-72 rounded-xl bg-slate-100 dark:bg-slate-800" />
                <div className="h-72 rounded-xl bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-48 rounded-xl bg-slate-100 dark:bg-slate-800" />
                <div className="h-48 rounded-xl bg-slate-100 dark:bg-slate-800" />
            </div>
            {rows > 0 && <div className="h-24 rounded-xl bg-slate-100 dark:bg-slate-800" />}
        </div>
    )
}

/* ──────────────────────────────────────────────────────────────────────────
 * Empty state — used inside panels when there's no data.
 * ────────────────────────────────────────────────────────────────────────── */
export function EmptyState({
    icon,
    title,
    description,
    action,
}: {
    icon?: ReactNode
    title: string
    description?: string
    action?: ReactNode
}) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-8 px-4">
            {icon && (
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-400 dark:text-slate-500">
                    {icon}
                </div>
            )}
            <p className="font-semibold text-sm text-slate-900 dark:text-white">{title}</p>
            {description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{description}</p>
            )}
            {action && <div className="mt-3">{action}</div>}
        </div>
    )
}
