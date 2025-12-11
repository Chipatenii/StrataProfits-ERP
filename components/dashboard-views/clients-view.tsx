"use client"

import { useState, useEffect } from "react"
import { Plus, Users, Search, Folder, Globe, Facebook, Instagram, Phone, Mail, MapPin } from "lucide-react"
import { Client } from "@/lib/types"
import { AdminCreateClientModal } from "@/components/modals/admin-create-client-modal"

export function ClientsView() {
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Clients</h2>
                    <p className="text-muted-foreground">Manage your agency clients and their projects</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)} // TODO: Implement Modal
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-border focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p>Loading clients...</p>
                ) : filteredClients.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        No clients found.
                    </div>
                ) : (
                    filteredClients.map(client => (
                        <div key={client.id} className="glass-card p-6 rounded-xl hover:shadow-lg transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white
                                ${client.type === 'dev' ? 'bg-blue-500' :
                                            client.type === 'design' ? 'bg-purple-500' :
                                                client.type === 'marketing' ? 'bg-pink-500' : 'bg-gray-500'}`}>
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{client.name}</h3>
                                        {client.business_name && <p className="text-sm text-muted-foreground">{client.business_name}</p>}
                                    </div>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded-full font-medium
                          ${client.status === 'Active' ? 'bg-green-100 text-green-700' :
                                        client.status === 'Lead' ? 'bg-amber-100 text-amber-700' :
                                            'bg-gray-100 text-gray-700'}`}>
                                    {client.status}
                                </span>
                            </div>

                            <div className="space-y-2 text-sm text-muted-foreground mb-4">
                                {client.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4" /> {client.email}
                                    </div>
                                )}
                                {client.location && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4" /> {client.location}
                                    </div>
                                )}
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
                onOpenChange={setShowCreateModal}
                onSuccess={fetchClients}
            />
        </div>
    )
}
