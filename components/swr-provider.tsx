"use client"

import { SWRConfig } from "swr"
import type { ReactNode } from "react"

/**
 * Global SWR defaults.
 *
 * - `refreshInterval: 60_000` — every SWR hook revalidates every 60s as a
 *   safety net on top of focus/realtime events. Prevents "database not in
 *   sync" when realtime channels drop or the tab is long-lived.
 * - `revalidateOnFocus: true` — already SWR's default, restated for clarity.
 * - `dedupingInterval: 5_000` — coalesces repeat fetches triggered by
 *   component remounts during route changes.
 *
 * Individual callers can still pass their own options to override (e.g. the
 * VA overview uses 30s for tighter sync).
 */
export function SWRProvider({ children }: { children: ReactNode }) {
    return (
        <SWRConfig
            value={{
                refreshInterval: 60_000,
                revalidateOnFocus: true,
                revalidateOnReconnect: true,
                dedupingInterval: 5_000,
                shouldRetryOnError: true,
                errorRetryCount: 3,
            }}
        >
            {children}
        </SWRConfig>
    )
}
