"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { Check, ChevronDown, Search, X } from "lucide-react"

interface UserOption {
  id: string
  full_name: string | null
  email?: string | null
  role?: string | null
}

interface MultiUserSelectProps {
  users: UserOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  placeholder?: string
  emptyLabel?: string
  disabled?: boolean
  /** When true, the first selected user is rendered with a "Primary" badge. */
  showPrimary?: boolean
  /** Optional className for the trigger button. */
  className?: string
}

export function MultiUserSelect({
  users,
  selectedIds,
  onChange,
  placeholder = "Select team members…",
  emptyLabel = "No team members found",
  disabled = false,
  showPrimary = true,
  className = "",
}: MultiUserSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => {
      const name = (u.full_name || "").toLowerCase()
      const email = (u.email || "").toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }, [users, search])

  const selectedUsers = useMemo(
    () => selectedIds
      .map((id) => users.find((u) => u.id === id))
      .filter((u): u is UserOption => Boolean(u)),
    [selectedIds, users]
  )

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => x !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  const removeOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selectedIds.filter((x) => x !== id))
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className="mt-1 w-full min-h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-left text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
            {selectedUsers.length === 0 ? (
              <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>
            ) : (
              selectedUsers.map((u, idx) => (
                <span
                  key={u.id}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                    showPrimary && idx === 0
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  }`}
                >
                  {showPrimary && idx === 0 && (
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">Primary</span>
                  )}
                  {u.full_name || "Unnamed"}
                  <button
                    type="button"
                    onClick={(e) => removeOne(u.id, e)}
                    className="hover:bg-black/10 dark:hover:bg-white/10 rounded p-0.5"
                    aria-label={`Remove ${u.full_name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg max-h-72 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full pl-8 pr-2 py-1.5 rounded-md text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">
                {emptyLabel}
              </p>
            ) : (
              filtered.map((u) => {
                const checked = selectedSet.has(u.id)
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggle(u.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 text-left"
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      checked
                        ? "bg-emerald-600 border-emerald-600"
                        : "border-slate-300 dark:border-slate-600"
                    }`}>
                      {checked && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 dark:text-white truncate">
                        {u.full_name || "Unnamed"}
                      </p>
                      {u.email && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {u.email}
                        </p>
                      )}
                    </div>
                    {u.role && (
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                        {u.role.replace(/_/g, " ")}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
