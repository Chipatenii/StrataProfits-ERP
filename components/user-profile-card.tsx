"use client"

import { User } from "lucide-react"
import { getRoleBadgeStyles, formatRoleName } from "@/lib/utils/role-styles"
import { AvailabilityIndicator } from "./ui/availability-indicator"

interface UserProfileCardProps {
  fullName: string
  email: string
  role: string
  avatarUrl?: string
  compact?: boolean
  userId?: string
}

export function UserProfileCard({ fullName, email, role, avatarUrl, compact = false, userId }: UserProfileCardProps) {
  const badgeStyles = getRoleBadgeStyles(role)

  if (compact) {
    return (
      <div className="inline-flex items-center gap-3 bg-white dark:bg-slate-900 p-1.5 pr-3 rounded-full md:rounded-xl md:p-3 md:border md:border-slate-200 md:dark:border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center flex-shrink-0 text-white">
          {avatarUrl ? (
            <img src={avatarUrl || "/placeholder.svg"} alt={fullName} className="w-full h-full rounded-lg object-cover" />
          ) : (
            <span className="text-xs font-bold">{fullName.substring(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div className="hidden md:block">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-none">{fullName}</h3>
            {userId && <AvailabilityIndicator userId={userId} />}
          </div>
          <p className={`text-[11px] mt-0.5 font-medium ${badgeStyles.text}`}>{formatRoleName(role)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-lg bg-emerald-700 flex items-center justify-center flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl || "/placeholder.svg"}
              alt={fullName}
              className="w-full h-full rounded-lg object-cover"
            />
          ) : (
            <User className="w-6 h-6 text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">{fullName}</h3>
            {userId && <AvailabilityIndicator userId={userId} showText={true} />}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{email}</p>
          <div className="mt-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${badgeStyles.badge}`}>
              {formatRoleName(role)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
