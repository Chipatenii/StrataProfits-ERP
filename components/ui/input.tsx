import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles
        "flex w-full rounded-xl border border-border bg-input px-4 py-3",
        "text-base text-foreground placeholder:text-muted-foreground",
        // Mobile-friendly sizing
        "min-h-[48px] touch-manipulation",
        // Focus states
        "transition-all duration-200",
        "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
        // File input
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        // Disabled
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Invalid
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        // Dark mode adjustments
        "dark:bg-input/50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
