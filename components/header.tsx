"use client"

import { Zap } from "lucide-react"

export function Header() {
  return (
    <header className="glass-card border-b border-border/30 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">Ostento</h1>
            <p className="text-xs text-muted-foreground">Task Tracker</p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">Remote Team Management</div>
      </div>
    </header>
  )
}
