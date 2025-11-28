"use client"

import { User } from "lucide-react"

interface UserProfileCardProps {
  fullName: string
  email: string
  role: string
  avatarUrl?: string
}

export function UserProfileCard({ fullName, email, role, avatarUrl }: UserProfileCardProps) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center flex-shrink-0">
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
          <h3 className="text-lg font-semibold text-foreground">{fullName}</h3>
          <p className="text-sm text-muted-foreground">{email}</p>
          <div className="mt-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent/20 text-accent">
              {role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
