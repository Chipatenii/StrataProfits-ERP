"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { BookOpen, BookText, Scale, Plus, RefreshCw } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Account, AccountBalance, JournalEntry, JournalLine } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then(r => r.json())

function formatZMW(n: number) {
    return `ZMW ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function AccountingView() {
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="relative overflow-hidden rounded-3xl bg-primary p-8 md:p-10 text-white shadow-2xl shadow-primary/30">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-5 h-5 text-emerald-200" />
                        <span className="text-sm font-medium text-emerald-100 uppercase tracking-wider">General Ledger</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Accounting</h1>
                    <p className="text-emerald-100/80 text-lg">Chart of accounts, journal entries, and trial balance</p>
                </div>
            </div>

            <Tabs defaultValue="coa" className="space-y-6">
                <TabsList className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-800 h-auto">
                    <TabsTrigger value="coa" className="px-6 py-3 rounded-xl text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-white">
                        <BookText className="w-4 h-4 mr-2" /> Chart of Accounts
                    </TabsTrigger>
                    <TabsTrigger value="journal" className="px-6 py-3 rounded-xl text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-white">
                        <BookOpen className="w-4 h-4 mr-2" /> Journal
                    </TabsTrigger>
                    <TabsTrigger value="trial" className="px-6 py-3 rounded-xl text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-white">
                        <Scale className="w-4 h-4 mr-2" /> Trial Balance
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="coa"><ChartOfAccountsTab /></TabsContent>
                <TabsContent value="journal"><JournalTab /></TabsContent>
                <TabsContent value="trial"><TrialBalanceTab /></TabsContent>
            </Tabs>
        </div>
    )
}

function ChartOfAccountsTab() {
    const { data: accounts, mutate, isLoading } = useSWR<Account[]>("/api/accounting/accounts", fetcher)

    const grouped = useMemo(() => {
        const order = ["asset", "liability", "equity", "revenue", "expense"] as const
        const map = new Map<string, Account[]>()
        order.forEach(t => map.set(t, []))
        ;(accounts || []).forEach(a => {
            if (map.has(a.type)) map.get(a.type)!.push(a)
        })
        return order.map(t => ({ type: t, accounts: map.get(t) || [] }))
    }, [accounts])

    async function toggleActive(acc: Account) {
        await fetch(`/api/accounting/accounts?id=${acc.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: !acc.is_active }),
        })
        mutate()
    }

    if (isLoading) return <div className="text-muted-foreground p-6">Loading…</div>

    return (
        <div className="space-y-4">
            {grouped.map(({ type, accounts }) => (
                <div key={type} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800 overflow-hidden">
                    <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{type}s</h3>
                    </div>
                    <div className="divide-y divide-slate-200 dark:divide-slate-800">
                        {accounts.length === 0 && (
                            <div className="px-6 py-4 text-sm text-muted-foreground italic">No {type} accounts</div>
                        )}
                        {accounts.map(a => (
                            <div key={a.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-sm text-muted-foreground">{a.code}</span>
                                        <span className="font-medium">{a.name}</span>
                                        {a.is_system && <span className="text-[10px] uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">System</span>}
                                        {!a.is_active && <span className="text-[10px] uppercase tracking-wider bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded">Inactive</span>}
                                    </div>
                                    {a.description && <div className="text-xs text-muted-foreground mt-0.5">{a.description}</div>}
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => toggleActive(a)}>
                                    {a.is_active ? "Deactivate" : "Activate"}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

function JournalTab() {
    const [from, setFrom] = useState("")
    const [to, setTo] = useState("")
    const [source, setSource] = useState("")

    const params = new URLSearchParams()
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    if (source) params.set("source_type", source)

    const { data: entries, mutate, isLoading } = useSWR<(JournalEntry & { lines: (JournalLine & { account: Account })[] })[]>(
        `/api/accounting/journal?${params.toString()}`,
        fetcher
    )

    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-800 flex flex-wrap items-end gap-3">
                <div>
                    <label className="text-xs text-muted-foreground block mb-1">From</label>
                    <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
                </div>
                <div>
                    <label className="text-xs text-muted-foreground block mb-1">To</label>
                    <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" />
                </div>
                <div>
                    <label className="text-xs text-muted-foreground block mb-1">Source</label>
                    <select value={source} onChange={e => setSource(e.target.value)} className="h-10 rounded-md border border-input bg-transparent px-3 text-sm">
                        <option value="">All</option>
                        <option value="payment">Payment</option>
                        <option value="expense">Expense</option>
                        <option value="payroll">Payroll</option>
                        <option value="manual">Manual</option>
                        <option value="fx_revaluation">FX Revaluation</option>
                    </select>
                </div>
                <Button variant="outline" size="sm" onClick={() => mutate()}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </Button>
            </div>

            {isLoading && <div className="text-muted-foreground p-6">Loading…</div>}

            <div className="space-y-3">
                {(entries || []).map(entry => {
                    const totalDebit = (entry.lines || []).reduce((s, l) => s + Number(l.base_debit || 0), 0)
                    return (
                        <div key={entry.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800 overflow-hidden">
                            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-4">
                                    <span className="font-mono text-sm font-semibold">{entry.entry_number}</span>
                                    <span className="text-sm text-muted-foreground">{entry.entry_date}</span>
                                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                                        entry.status === "posted" ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" :
                                        entry.status === "reversed" ? "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300" :
                                        "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                    }`}>{entry.status}</span>
                                    <span className="text-[10px] uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{entry.source_type}</span>
                                </div>
                                <span className="text-sm font-semibold">{formatZMW(totalDebit)}</span>
                            </div>
                            {entry.memo && <div className="px-6 py-2 text-sm text-muted-foreground border-b border-slate-200 dark:border-slate-800">{entry.memo}</div>}
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50/50 dark:bg-slate-800/20">
                                    <tr className="text-muted-foreground">
                                        <th className="text-left px-6 py-2 font-medium">Account</th>
                                        <th className="text-right px-6 py-2 font-medium w-32">Debit</th>
                                        <th className="text-right px-6 py-2 font-medium w-32">Credit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(entry.lines || []).map(line => (
                                        <tr key={line.id} className="border-t border-slate-100 dark:border-slate-800/50">
                                            <td className="px-6 py-2">
                                                <span className="font-mono text-xs text-muted-foreground mr-2">{line.account?.code}</span>
                                                {line.account?.name}
                                                {line.memo && <span className="text-xs text-muted-foreground ml-2">— {line.memo}</span>}
                                            </td>
                                            <td className="px-6 py-2 text-right font-mono">{Number(line.base_debit) > 0 ? formatZMW(Number(line.base_debit)) : ""}</td>
                                            <td className="px-6 py-2 text-right font-mono">{Number(line.base_credit) > 0 ? formatZMW(Number(line.base_credit)) : ""}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                })}
                {!isLoading && (entries || []).length === 0 && (
                    <div className="text-center text-muted-foreground p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                        No journal entries match the current filters.
                    </div>
                )}
            </div>
        </div>
    )
}

function TrialBalanceTab() {
    const [asOf, setAsOf] = useState<string>("")
    const url = asOf ? `/api/accounting/trial-balance?as_of=${asOf}` : `/api/accounting/trial-balance`
    const { data: rows, mutate, isLoading } = useSWR<AccountBalance[]>(url, fetcher)

    const totals = useMemo(() => {
        const t = { debit: 0, credit: 0 }
        ;(rows || []).forEach(r => {
            t.debit += Number(r.total_debits) || 0
            t.credit += Number(r.total_credits) || 0
        })
        return t
    }, [rows])

    const balanced = Math.abs(totals.debit - totals.credit) < 0.01

    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/50 dark:border-slate-800 flex items-end gap-3">
                <div>
                    <label className="text-xs text-muted-foreground block mb-1">As of date</label>
                    <Input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className="w-40" />
                </div>
                <Button variant="outline" size="sm" onClick={() => mutate()}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </Button>
                <div className="ml-auto">
                    <span className={`text-sm font-semibold ${balanced ? "text-emerald-600" : "text-red-600"}`}>
                        {balanced ? "Balanced" : "Out of balance"}
                    </span>
                </div>
            </div>

            {isLoading && <div className="text-muted-foreground p-6">Loading…</div>}

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/50 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr className="text-muted-foreground">
                            <th className="text-left px-6 py-3 font-medium w-24">Code</th>
                            <th className="text-left px-6 py-3 font-medium">Account</th>
                            <th className="text-left px-6 py-3 font-medium w-28">Type</th>
                            <th className="text-right px-6 py-3 font-medium w-40">Debit</th>
                            <th className="text-right px-6 py-3 font-medium w-40">Credit</th>
                            <th className="text-right px-6 py-3 font-medium w-40">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(rows || []).map(r => (
                            <tr key={r.account_id ?? r.code} className="border-t border-slate-100 dark:border-slate-800/50">
                                <td className="px-6 py-2 font-mono text-xs text-muted-foreground">{r.code}</td>
                                <td className="px-6 py-2">{r.name}</td>
                                <td className="px-6 py-2 text-xs text-muted-foreground capitalize">{r.type}</td>
                                <td className="px-6 py-2 text-right font-mono">{Number(r.total_debits) > 0 ? formatZMW(Number(r.total_debits)) : ""}</td>
                                <td className="px-6 py-2 text-right font-mono">{Number(r.total_credits) > 0 ? formatZMW(Number(r.total_credits)) : ""}</td>
                                <td className="px-6 py-2 text-right font-mono font-semibold">{formatZMW(Number(r.balance))}</td>
                            </tr>
                        ))}
                        {(rows || []).length > 0 && (
                            <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 font-semibold">
                                <td colSpan={3} className="px-6 py-3 text-right">Totals</td>
                                <td className="px-6 py-3 text-right font-mono">{formatZMW(totals.debit)}</td>
                                <td className="px-6 py-3 text-right font-mono">{formatZMW(totals.credit)}</td>
                                <td />
                            </tr>
                        )}
                    </tbody>
                </table>
                {!isLoading && (rows || []).length === 0 && (
                    <div className="text-center text-muted-foreground p-12">No activity yet.</div>
                )}
            </div>
        </div>
    )
}
