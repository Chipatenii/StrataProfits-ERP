"use client"

import { useState } from "react"
import useSWR from "swr"
import { Users, Search, Globe, Facebook, Instagram, Phone, Mail, MapPin, Sparkles, UserPlus, Key, Edit } from "lucide-react"
import { Client } from "@/lib/types"
import { AdminCreateClientModal } from "@/components/modals/admin-create-client-modal"

export function ClientsView() {
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [editingClient, setEditingClient] = useState<Client | null>(null)

    const fetcher = (url: string) => fetch(url).then(res => res.json())
    const { data: clients = [], isLoading: loading, mutate: fetchClients } = useSWR<Client[]>("/api/admin/clients", fetcher)

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleEditClick = (client: Client) => {
        setEditingClient(client)
        setShowCreateModal(true)
    }

    const handleModalClose = (open: boolean) => {
        setShowCreateModal(open)
        if (!open) setEditingClient(null)
    }

    const handleInvite = async (clientId: string) => {
        if (!confirm("Are you sure you want to invite this client to the portal? They will receive an email to set their password.")) return

        try {
            const response = await fetch(`/api/admin/clients/${clientId}/invite`, { method: "POST" })
            const data = await response.json()

            if (!response.ok) {
                alert(`Error: ${data.error}`)
            } else {
                alert("Invitation sent successfully!")
            }
        } catch (error) {
            console.error("Error inviting client:", error)
            alert("An unexpected error occurred.")
        }
    }

    const activeClients = clients.filter(c => c.status === 'Active').length
    const premiumClients = clients.filter(c => c.value_tier === 'Premium').length

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">Clients</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your agency clients and their projects.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors font-semibold text-sm shadow-sm"
                >
                    <UserPlus className="w-4 h-4" />
                    Add client
                </button>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-3 gap-3 md:gap-4">
                <KpiCard label="Total clients" value={clients.length.toString()} />
                <KpiCard label="Active" value={activeClients.toString()} accent />
                <KpiCard label="Premium" value={premiumClients.toString()} />
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search clients by name or business"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-colors"
                />
            </div>

            {/* Clients grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Loading clients...</p>
                    </div>
                ) : filteredClients.length === 0 ? (
                    <div className="col-span-full text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">No clients found</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Add your first client to get started.</p>
                    </div>
                ) : (
                    filteredClients.map(client => (
                        <div
                            key={client.id}
                            className="group relative bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                        >
                            <div className="absolute top-3 right-3 flex items-center gap-0.5">
                                <button
                                    onClick={() => handleInvite(client.id)}
                                    className="p-1.5 text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-md transition-colors"
                                    title="Invite to client portal"
                                >
                                    <Key className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleEditClick(client)}
                                    className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                                    title="Edit client"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-start gap-3 mb-3 pr-14">
                                <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-white shrink-0
                                    ${client.type === 'dev' ? 'bg-blue-600' :
                                        client.type === 'design' ? 'bg-violet-600' :
                                            client.type === 'marketing' ? 'bg-pink-600' :
                                                'bg-slate-600'}`}
                                >
                                    <Users className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-semibold text-[15px] text-slate-900 dark:text-white truncate">{client.name}</h3>
                                    {client.business_name && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{client.business_name}</p>}
                                </div>
                            </div>

                            <div className="mb-3">
                                <span className={`inline-flex px-2 py-0.5 text-[11px] rounded-md font-semibold
                                    ${client.status === 'Active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                                        client.status === 'Lead' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                                    {client.status}
                                </span>
                            </div>

                            <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400 mb-3">
                                {client.email && (
                                    <div className="flex items-center gap-2 truncate">
                                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate">{client.email}</span>
                                    </div>
                                )}
                                {client.phone && (
                                    <div className="flex items-center gap-2 truncate">
                                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate">{client.phone}</span>
                                    </div>
                                )}
                                {client.location && (
                                    <div className="flex items-center gap-2 truncate">
                                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="truncate">{client.location}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex gap-2">
                                    {client.social_links?.website && (
                                        <a href={client.social_links.website} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                                            <Globe className="w-4 h-4" />
                                        </a>
                                    )}
                                    {client.social_links?.facebook && (
                                        <a href={client.social_links.facebook} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600 transition-colors">
                                            <Facebook className="w-4 h-4" />
                                        </a>
                                    )}
                                    {client.social_links?.instagram && (
                                        <a href={client.social_links.instagram} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-pink-600 transition-colors">
                                            <Instagram className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>

                                {client.value_tier === 'Premium' && (
                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-md text-[11px] font-semibold">
                                        <Sparkles className="w-3 h-3" />
                                        Premium
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <AdminCreateClientModal
                open={showCreateModal}
                onOpenChange={handleModalClose}
                onSuccess={fetchClients}
                client={editingClient}
            />
        </div>
    )
}

function KpiCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
            <p className={`text-2xl md:text-[26px] font-bold leading-tight mt-1 ${accent ? "text-emerald-700 dark:text-emerald-300" : "text-slate-900 dark:text-white"}`}>{value}</p>
        </div>
    )
}
