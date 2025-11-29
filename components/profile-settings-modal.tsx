"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { X } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { updateProfileSchema } from "@/lib/schemas"

// Extend the schema for password fields which are local to this form
const profileFormSchema = updateProfileSchema.extend({
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  newPassword: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  confirmPassword: z.string().optional().or(z.literal("")),
}).refine((data) => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false
  }
  return true
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

interface ProfileSettingsModalProps {
  userId: string
  isAdmin: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ProfileSettingsModal({ userId, isAdmin, onClose, onSuccess }: ProfileSettingsModalProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      userId,
      fullName: "",
      email: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const onSubmit = async (data: ProfileFormValues) => {
    setLoading(true)
    setMessage(null)

    try {
      // Update full name in profile
      if (data.fullName) {
        const response = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            fullName: data.fullName,
          }),
        })
        if (!response.ok) throw new Error("Failed to update name")
      }

      // Update email
      if (data.email) {
        const { error } = await supabase.auth.updateUser({ email: data.email })
        if (error) throw error
      }

      // Update password
      if (data.newPassword) {
        const { error } = await supabase.auth.updateUser({ password: data.newPassword })
        if (error) throw error
      }

      setMessage({ type: "success", text: "Profile updated successfully!" })
      reset({
        userId,
        fullName: "",
        email: "",
        newPassword: "",
        confirmPassword: "",
      })

      setTimeout(() => {
        onSuccess()
      }, 1500)
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Account Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input
              {...register("fullName")}
              type="text"
              placeholder="Enter your full name"
              className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              {...register("email")}
              type="email"
              placeholder="Enter new email"
              className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium mb-3">Change Password</h3>

            <div>
              <label className="block text-sm font-medium mb-2">New Password</label>
              <input
                {...register("newPassword")}
                type="password"
                placeholder="Enter new password"
                className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-accent"
              />
              {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword.message}</p>}
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <input
                {...register("confirmPassword")}
                type="password"
                placeholder="Confirm new password"
                className="w-full px-4 py-2 rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-accent"
              />
              {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
            </div>
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
