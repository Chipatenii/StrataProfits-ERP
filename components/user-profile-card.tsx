"use client"

import { User } from "lucide-react"
import { getRoleBadgeStyles, formatRoleName } from "@/lib/utils/role-styles"

interface UserProfileCardProps {
  fullName: string
  email: string
  role: string
  avatarUrl?: string
  compact?: boolean
}

export function UserProfileCard({ fullName, email, role, avatarUrl, compact = false }: UserProfileCardProps) {
  const badgeStyles = getRoleBadgeStyles(role)

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-blue-50/50 p-1.5 pr-3 rounded-full md:rounded-xl md:p-3 md:bg-white md:border md:border-gray-200 md:shadow-sm">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center flex-shrink-0 text-white shadow-sm">
          {avatarUrl ? (
            <img src={avatarUrl || "/placeholder.svg"} alt={fullName} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-xs font-bold">{fullName.substring(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div className="hidden md:block">
          <h3 className="text-sm font-semibold text-gray-900 leading-none">{fullName}</h3>
          <p className={`text-xs mt-0.5 font-medium ${badgeStyles.text}`}>{formatRoleName(role)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-md">
          {avatarUrl ? (
            <img
              src={avatarUrl || "/placeholder.svg"}
              alt={fullName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <User className="w-8 h-8 text-white" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{fullName}</h3>
          <p className="text-sm text-gray-500">{email}</p>
          <div className="mt-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badgeStyles.badge}`}>
              {formatRoleName(role)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

