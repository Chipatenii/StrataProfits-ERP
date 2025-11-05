"use client"

import { useState } from "react"
import { createAdminUser } from "@/app/actions/setup"

export default function SetupPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleCreateAdmin = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const result = await createAdminUser()
      if (result.success) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 backdrop-blur-sm border border-slate-200">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Setup</h1>
            <p className="text-slate-600">Initialize your admin account for Ostento Media Agency</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900">
              <strong>Default Credentials:</strong>
              <br />
              Email: admin@ostento.com
              <br />
              Password: 1234
            </p>
          </div>

          <button
            onClick={handleCreateAdmin}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-lg"
          >
            {loading ? "Creating Admin User..." : "Create Admin User"}
          </button>

          {message && (
            <div
              className={`mt-6 p-4 rounded-lg ${
                message.type === "success"
                  ? "bg-green-50 border border-green-200 text-green-900"
                  : "bg-red-50 border border-red-200 text-red-900"
              }`}
            >
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          <p className="text-center text-xs text-slate-500 mt-6">
            You can only create one admin user. If you need to change credentials, update them directly in Supabase.
          </p>
        </div>
      </div>
    </div>
  )
}
