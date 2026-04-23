"use client"

import { useState, useEffect } from "react"
import { createAdminUser } from "@/app/actions/setup"
import { createClient } from "@/lib/supabase/client"
import { APP_CONFIG } from "@/lib/config/constants"
import { APP_NAME } from "@/lib/config"

export default function SetupPage() {
  const [loading, setLoading] = useState(false)
  const [adminExists, setAdminExists] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    async function checkAdminExists() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from("profiles").select("id").eq("role", "admin").limit(APP_CONFIG.PAGINATION.DEFAULT_SINGLE_RECORD)

        if (!error && data && data.length > 0) {
          setAdminExists(true)
          setMessage({
            type: "success",
            text: "Admin user already exists. Setup is complete!",
          })
        }
      } catch (err) {
        console.error("[v0] Error checking admin:", err)
      } finally {
        setCheckingAdmin(false)
      }
    }

    checkAdminExists()
  }, [])

  const handleCreateAdmin = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const result = await createAdminUser()
      if (result.success) {
        setAdminExists(true)
        setMessage({
          type: "success",
          text: `Admin user created successfully! Email: ${result.email}, Password: ${result.password}`,
        })
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to create admin user",
        })
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "An error occurred",
      })
    } finally {
      setLoading(false)
    }
  }

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-emerald-700 border-t-transparent mb-4"></div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Checking setup status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
          <div className="text-center mb-6">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-1">
              {APP_NAME}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Setup</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {adminExists ? "Your system is ready." : `Initialize your admin account for ${APP_NAME}.`}
            </p>
          </div>

          {!adminExists && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 p-4 mb-6">
              <p className="text-sm text-emerald-900 dark:text-emerald-300">
                <strong className="font-semibold">Default Credentials:</strong>
                <br />
                Email: <span className="font-mono">admin@ostento.com</span>
                <br />
                Password: <span className="font-mono">1234</span>
              </p>
            </div>
          )}

          {!adminExists && (
            <button
              onClick={handleCreateAdmin}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-lg"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
              {loading ? "Creating Admin User..." : "Create Admin User"}
            </button>
          )}

          {message && (
            <div
              className={`mt-5 p-3 rounded-lg text-sm ${
                message.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400"
              }`}
            >
              <p>{message.text}</p>
            </div>
          )}

          {adminExists && (
            <button
              onClick={() => (window.location.href = "/dashboard")}
              className="w-full inline-flex items-center justify-center bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold py-3 rounded-lg mt-2"
            >
              Go to Dashboard
            </button>
          )}

          <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
            You can only create one admin user. If you need to change credentials, update them directly in Supabase.
          </p>
        </div>
      </div>
    </div>
  )
}
