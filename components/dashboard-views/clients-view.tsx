"use client"

import { useState, useEffect } from "react"
import { Plus, Users, Search, Folder, Globe, Facebook, Instagram, Phone, Mail, MapPin } from "lucide-react"
import { Client } from "@/lib/types"
import { AdminCreateClientModal } from "@/components/modals/admin-create-client-modal"

import { Edit } from "lucide-react"

export function ClientsView() {
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [editingClient, setEditingClient] = useState<Client | null>(null)

    useEffect(() => {
        fetchClients()
    }, [])

    const fetchClients = async () => {
        try {
            const response = await fetch("/api/admin/clients")
            if (response.ok) {
                const data = await response.json()
                setClients(data)
            }
        } catch (error) {
            console.error("Error loading clients:", error)
        } finally {
            setLoading(false)
        }
    }

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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Clients</h2>
                    <p className="text-muted-foreground">Manage your agency clients and their projects</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 hover:brightness-110 active:scale-[0.98] transition-all duration-200 font-semibold w-full sm:w-auto justify-center min-h-[48px]"
                >
                    <Plus className="w-4 h-4" />
                    Add Client
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all min-h-[48px]"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : filteredClients.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No clients found.
                    </div>
                ) : (
                    filteredClients.map(client => (
                        <div key={client.id} className="glass-card p-6 rounded-xl hover:shadow-lg transition-all group border border-border/50 relative">
                            <button
                                onClick={() => handleEditClick(client)}
                                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                            <div className="flex justify-between items-start mb-4 gap-2 pr-8">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0
                                ${client.type === 'dev' ? 'bg-blue-500' :
                                            client.type === 'design' ? 'bg-purple-500' :
                                                client.type === 'marketing' ? 'bg-pink-500' : 'bg-gray-500'}`}>
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-lg truncate">{client.name}</h3>
                                        {client.business_name && <p className="text-sm text-muted-foreground truncate">{client.business_name}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4">
                                <span className={`px-2.5 py-1 text-xs rounded-full font-medium whitespace-nowrap
                        ${client.status === 'Active' ? 'badge-success' :
                                        client.status === 'Lead' ? 'badge-warning' :
                                            'badge-neutral'}`}>
                                    {client.status}
                                </span>
                            </div>

                            <div className="space-y-2 text-sm text-muted-foreground mb-4">
                                {client.email && (
                                    <div className="flex items-center gap-2 truncate">
                                        <Mail className="w-4 h-4 shrink-0" /> <span className="truncate">{client.email}</span>
                                    </div>
                                )}
                                {client.phone && (
                                    <div className="flex items-center gap-2 truncate">
                                        <Phone className="w-4 h-4 shrink-0" /> <span className="truncate">{client.phone}</span>
                                    </div>
                                )}
                                {client.location && (
                                    <div className="flex items-center gap-2 truncate">
                                        <MapPin className="w-4 h-4 shrink-0" /> <span className="truncate">{client.location}</span>
                                    </div>
                                )}
                                {client.contact_person && (
                                    <div className="flex items-center gap-2 truncate text-xs">
                                        <span className="font-semibold text-gray-500">Contact:</span> <span className="truncate">{client.contact_person}</span>
                                    </div>
                                )}
                                {client.tpin && (
                                    <div className="flex items-center gap-2 truncate text-xs">
                                        <span className="font-semibold text-gray-500">TPIN:</span> <span className="font-mono bg-gray-100 px-1 rounded">{client.tpin}</span>
                                    </div>
                                )}
                                <div className="flex gap-3 mt-2 pt-2 border-t border-border/50">
                                    {client.social_links?.website && (
                                        <a href={client.social_links.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors">
                                            <Globe className="w-4 h-4" />
                                        </a>
                                    )}
                                    {client.social_links?.facebook && (
                                        <a href={client.social_links.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors">
                                            <Facebook className="w-4 h-4" />
                                        </a>
                                    )}
                                    {client.social_links?.instagram && (
                                        <a href={client.social_links.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-600 transition-colors">
                                            <Instagram className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>

                                {client.value_tier === 'Premium' && (
                                    <div className="inline-block px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded text-xs mt-2">
                                        💎 Premium Client
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
