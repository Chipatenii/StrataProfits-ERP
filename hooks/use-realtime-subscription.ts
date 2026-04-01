"use client"

import { useEffect, useMemo, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export function useRealtimeSubscription(table: string, callback: () => void, filter?: string) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const callbackRef = useRef(callback)

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}-${filter || 'all'}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: table,
          filter: filter,
        },
        () => {
          callbackRef.current()
          router.refresh()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter, router, supabase])
}
