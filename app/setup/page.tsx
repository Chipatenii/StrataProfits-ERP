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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">Checking setup status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 backdrop-blur-sm border border-slate-200">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Setup</h1>
            <p className="text-slate-600">
              {adminExists ? "Your system is ready" : `Initialize your admin account for ${APP_NAME}`}
            </p>
          </div>

          {!adminExists && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900">
                <strong>Default Credentials:</strong>
                <br />
                Email: admin@ostento.com
                <br />
                Password: 1234
              </p>
            </div>
          )}

          {!adminExists && (
            <button
              onClick={handleCreateAdmin}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-lg"
            >
              {loading ? "Creating Admin User..." : "Create Admin User"}
            </button>
          )}

          {message && (
            <div
              className={`mt-6 p-4 rounded-lg ${message.type === "success"
                  ? "bg-green-50 border border-green-200 text-green-900"
                  : "bg-red-50 border border-red-200 text-red-900"
                }`}
            >
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          {adminExists && (
            <button
              onClick={() => (window.location.href = "/dashboard")}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-lg"
            >
              Go to Dashboard
            </button>
          )}

          <p className="text-center text-xs text-slate-500 mt-6">
            You can only create one admin user. If you need to change credentials, update them directly in Supabase.
          </p>
        </div>
      </div>
    </div>
  )
}
