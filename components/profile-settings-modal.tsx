"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { User, Building2, Upload, X, Globe, Phone, Mail, MapPin, Landmark, CreditCard, Hash, Smartphone } from "lucide-react"
import { toast } from "sonner"
import type { OrganizationSettings, UserProfile } from "@/lib/types"

interface ProfileSettingsModalProps {
  userId: string
  isAdmin: boolean
  initialProfile?: UserProfile | null
  onClose: () => void
  onSuccess: () => void
}

export function ProfileSettingsModal({ userId, isAdmin, initialProfile, onClose, onSuccess }: ProfileSettingsModalProps) {
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<"personal" | "organization">("personal")

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("")
  const [hourlyRate, setHourlyRate] = useState("")

  const [org, setOrg] = useState<Partial<OrganizationSettings>>({})
  const [orgLoading, setOrgLoading] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(!initialProfile)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (initialProfile) {
      setFullName(initialProfile.full_name || "")
      setEmail(initialProfile.email || "")
      setRole(initialProfile.role || "developer")
      setHourlyRate(initialProfile.hourly_rate?.toString() || "")
      return
    }

    const fetchProfile = async () => {
      try {
        let data

        if (isAdmin) {
          const response = await fetch(`/api/admin/members/${userId}`)
          if (!response.ok) {
            const errText = await response.text()
            console.error("[ProfileSettings] Fetch failed:", response.status, errText)
            throw new Error(`Failed to fetch profile via API: ${response.status} ${errText}`)
          }
          data = await response.json()
        } else {
          const response = await fetch("/api/profile")
          if (!response.ok) {
            throw new Error("Failed to load profile")
          }
          data = await response.json()
        }

        if (data) {
          setFullName(data.full_name || "")
          setEmail(data.email || "")
          setRole(data.role || "developer")
          setHourlyRate(data.hourly_rate?.toString() || "")
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
        toast.error("Failed to load user data")
      } finally {
        setFetching(false)
      }
    }
    fetchProfile()
  }, [userId, isAdmin, initialProfile])

  useEffect(() => {
    if (!isAdmin) return
    const fetchOrg = async () => {
      try {
        const res = await fetch("/api/organization")
        if (res.ok) {
          const data = await res.json()
          setOrg(data)
          if (data.logo_url) setLogoPreview(data.logo_url)
        }
      } catch (e) {
        console.error("Error fetching org settings:", e)
      }
    }
    fetchOrg()
  }, [isAdmin])

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be smaller than 2MB")
      return
    }

    setLogoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setLogoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    setOrg(prev => ({ ...prev, logo_url: null }))
    if (logoInputRef.current) logoInputRef.current.value = ""
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (!userId) {
      setMessage({ type: "error", text: "User ID is missing. Please refresh and try again." })
      setLoading(false)
      return
    }

    try {
      if (fullName) {
        const response = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, fullName }),
        })
        if (!response.ok) throw new Error("Failed to update name")
      }

      if (isAdmin) {
        const adminBody: { role?: string; hourly_rate?: number } = {}
        if (role) adminBody.role = role
        if (hourlyRate) adminBody.hourly_rate = Number.parseFloat(hourlyRate)
        if (Object.keys(adminBody).length > 0) {
          const response = await fetch(`/api/admin/members/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(adminBody),
          })
          if (!response.ok) throw new Error("Failed to update role/rate")
        }
      }

      if (email) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id === userId) {
          const { error } = await supabase.auth.updateUser({ email })
          if (error) throw error
        } else {
          console.warn("Cannot update another user's email via client SDK")
        }
      }

      setMessage({ type: "success", text: "Profile updated successfully!" })
      setTimeout(() => { onSuccess() }, 1500)
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "An error occurred",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    setOrgLoading(true)
    setMessage(null)

    try {
      let logoUrl = org.logo_url || null

      if (logoFile) {
        const ext = logoFile.name.split(".").pop()
        const filePath = `logo-${Date.now()}.${ext}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("company-logos")
          .upload(filePath, logoFile, { upsert: true })

        if (uploadError) throw new Error(`Logo upload failed: ${uploadError.message}`)

        const { data: urlData } = supabase.storage
          .from("company-logos")
          .getPublicUrl(uploadData.path)

        logoUrl = urlData.publicUrl
      }

      const payload: Partial<OrganizationSettings> & { logo_url: string | null } = {
        name: org.name,
        email: org.email,
        phone: org.phone,
        address: org.address,
        website: org.website,
        tax_id: org.tax_id,
        bank_name: org.bank_name,
        bank_account: org.bank_account,
        bank_branch: org.bank_branch,
        mobile_money_provider: org.mobile_money_provider,
        mobile_money_name: org.mobile_money_name,
        mobile_money_number: org.mobile_money_number,
        logo_url: logoUrl,
      }

      const res = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update organization settings")
      }

      const updated = await res.json()
      setOrg(updated)
      setLogoFile(null)
      if (updated.logo_url) setLogoPreview(updated.logo_url)

      setMessage({ type: "success", text: "Organization settings updated!" })
      setTimeout(() => { onSuccess() }, 1500)
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "An error occurred",
      })
    } finally {
      setOrgLoading(false)
    }
  }

  const updateOrg = (field: keyof OrganizationSettings, value: string) => {
    setOrg(prev => ({ ...prev, [field]: value }))
  }

  if (fetching) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-600 border-t-transparent" />
          <span className="text-sm text-slate-700 dark:text-slate-300">Loading settings...</span>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex flex-col max-w-lg w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] p-0 gap-0 rounded-none sm:rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">

        <div className="flex-none px-4 pt-5 pb-3 sm:px-6 border-b border-slate-200 dark:border-slate-800">
          <DialogTitle className="text-lg font-bold leading-tight text-slate-900 dark:text-white">Settings</DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your profile and organization details.
          </DialogDescription>

          {isAdmin && (
            <div className="flex mt-4 gap-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg p-1">
              <button
                type="button"
                onClick={() => { setActiveTab("personal"); setMessage(null) }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === "personal"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <User size={15} />
                Personal
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("organization"); setMessage(null) }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === "organization"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Building2 size={15} />
                Organization
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">

          {activeTab === "personal" && (
            <form id="personal-form" onSubmit={handleUpdateProfile} className="px-4 sm:px-6 py-5 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name"
                  className="h-11 rounded-lg border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  className="h-11 rounded-lg border-slate-200 dark:border-slate-800"
                />
              </div>

              {isAdmin && (
                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 space-y-4">
                  <h3 className="text-xs font-semibold text-emerald-700 mb-3 uppercase tracking-wide">Admin Controls</h3>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <select
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="flex h-11 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="developer">Developer</option>
                      <option value="graphic_designer">Graphic Designer</option>
                      <option value="social_media_manager">Social Media Manager</option>
                      <option value="virtual_assistant">Virtual Assistant</option>
                      <option value="book_keeper">Book Keeper</option>
                      <option value="marketing">Marketing</option>
                      <option value="sales">Sales</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Hourly Rate (ZMW)</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      step="0.01"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      placeholder="0.00"
                      className="h-11 rounded-lg border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  value={initialProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                  className="flex h-11 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  disabled
                >
                  <option>{initialProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}</option>
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400">Auto-detected from your browser. Timezone support coming soon.</p>
              </div>

              {message && activeTab === "personal" && (
                <div
                  className={`p-3 rounded-lg text-sm border ${
                    message.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50"
                      : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50"
                  }`}
                >
                  {message.text}
                </div>
              )}
            </form>
          )}

          {activeTab === "organization" && isAdmin && (
            <form id="org-form" onSubmit={handleUpdateOrg} className="px-4 sm:px-6 py-5 space-y-5">

              <div className="space-y-2">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-center overflow-hidden group">
                    {logoPreview ? (
                      <>
                        <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute top-0.5 right-0.5 p-1 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <Building2 size={28} className="text-slate-400" />
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Upload size={14} /> Upload Logo
                    </button>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">PNG, JPG or SVG. Max 2MB.</p>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={handleLogoSelect}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgName" className="flex items-center gap-1.5">
                  <Building2 size={14} className="text-emerald-700" /> Company Name
                </Label>
                <Input
                  id="orgName"
                  value={org.name || ""}
                  onChange={(e) => updateOrg("name", e.target.value)}
                  placeholder="Your Company Name"
                  className="h-11 rounded-lg border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orgEmail" className="flex items-center gap-1.5">
                    <Mail size={14} className="text-emerald-700" /> Email
                  </Label>
                  <Input
                    id="orgEmail"
                    type="email"
                    value={org.email || ""}
                    onChange={(e) => updateOrg("email", e.target.value)}
                    placeholder="company@example.com"
                    className="h-11 rounded-lg border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgPhone" className="flex items-center gap-1.5">
                    <Phone size={14} className="text-emerald-700" /> Phone
                  </Label>
                  <Input
                    id="orgPhone"
                    value={org.phone || ""}
                    onChange={(e) => updateOrg("phone", e.target.value)}
                    placeholder="+260 xxx xxx xxx"
                    className="h-11 rounded-lg border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgAddress" className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-emerald-700" /> Address
                </Label>
                <Textarea
                  id="orgAddress"
                  value={org.address || ""}
                  onChange={(e) => updateOrg("address", e.target.value)}
                  placeholder="Street address, City, Country"
                  className="min-h-[72px] rounded-lg border-slate-200 dark:border-slate-800 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orgWebsite" className="flex items-center gap-1.5">
                    <Globe size={14} className="text-emerald-700" /> Website
                  </Label>
                  <Input
                    id="orgWebsite"
                    value={org.website || ""}
                    onChange={(e) => updateOrg("website", e.target.value)}
                    placeholder="https://example.com"
                    className="h-11 rounded-lg border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgTaxId" className="flex items-center gap-1.5">
                    <Hash size={14} className="text-emerald-700" /> Tax ID / TPIN
                  </Label>
                  <Input
                    id="orgTaxId"
                    value={org.tax_id || ""}
                    onChange={(e) => updateOrg("tax_id", e.target.value)}
                    placeholder="Tax ID number"
                    className="h-11 rounded-lg border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 space-y-4">
                <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Landmark size={14} /> Banking Details
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">These details appear on invoices and receipts.</p>

                <div className="space-y-2">
                  <Label htmlFor="orgBankName">Bank Name</Label>
                  <Input
                    id="orgBankName"
                    value={org.bank_name || ""}
                    onChange={(e) => updateOrg("bank_name", e.target.value)}
                    placeholder="e.g. FNB Zambia"
                    className="h-11 rounded-lg border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgBankAccount" className="flex items-center gap-1.5">
                      <CreditCard size={14} /> Account Number
                    </Label>
                    <Input
                      id="orgBankAccount"
                      value={org.bank_account || ""}
                      onChange={(e) => updateOrg("bank_account", e.target.value)}
                      placeholder="Account number"
                      className="h-11 rounded-lg border-slate-200 dark:border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgBankBranch">Branch</Label>
                    <Input
                      id="orgBankBranch"
                      value={org.bank_branch || ""}
                      onChange={(e) => updateOrg("bank_branch", e.target.value)}
                      placeholder="e.g. Lusaka Main"
                      className="h-11 rounded-lg border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 space-y-4">
                <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Smartphone size={14} /> Mobile Money
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">Mobile money details for receiving payments.</p>

                <div className="space-y-2">
                  <Label htmlFor="orgMomoProvider">Provider</Label>
                  <select
                    id="orgMomoProvider"
                    value={org.mobile_money_provider || ""}
                    onChange={(e) => updateOrg("mobile_money_provider", e.target.value)}
                    className="flex h-11 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">Select provider</option>
                    <option value="Airtel Money">Airtel Money</option>
                    <option value="MTN MoMo">MTN MoMo</option>
                    <option value="Zamtel Kwacha">Zamtel Kwacha</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgMomoName">Registered Name</Label>
                    <Input
                      id="orgMomoName"
                      value={org.mobile_money_name || ""}
                      onChange={(e) => updateOrg("mobile_money_name", e.target.value)}
                      placeholder="Name on account"
                      className="h-11 rounded-lg border-slate-200 dark:border-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgMomoNumber" className="flex items-center gap-1.5">
                      <Phone size={14} /> Phone Number
                    </Label>
                    <Input
                      id="orgMomoNumber"
                      value={org.mobile_money_number || ""}
                      onChange={(e) => updateOrg("mobile_money_number", e.target.value)}
                      placeholder="e.g. 097XXXXXXX"
                      className="h-11 rounded-lg border-slate-200 dark:border-slate-800"
                    />
                  </div>
                </div>
              </div>

              {message && activeTab === "organization" && (
                <div
                  className={`p-3 rounded-lg text-sm border ${
                    message.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50"
                      : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50"
                  }`}
                >
                  {message.text}
                </div>
              )}
            </form>
          )}

          <div className="h-2" />
        </div>

        <div className="flex-none border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 sm:px-6">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            {activeTab === "personal" ? (
              <button
                form="personal-form"
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
              >
                {loading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
                {loading ? "Saving..." : "Save Profile"}
              </button>
            ) : (
              <button
                form="org-form"
                type="submit"
                disabled={orgLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
              >
                {orgLoading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
                {orgLoading ? "Saving..." : "Save Organization"}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
