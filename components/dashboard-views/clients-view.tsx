"use client"

import { useState, useEffect } from "react"
import { Users, Search, Globe, Facebook, Instagram, Phone, Mail, MapPin, Sparkles, Building2, UserPlus, Key } from "lucide-react"
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

    const handleInvite = async (clientId: string) => {
        if (!confirm("Are you sure you want to invite this client to the portal? They will receive an email to set their password.")) return;
        
        try {
            const response = await fetch(`/api/admin/clients/${clientId}/invite`, {
                method: "POST"
            });
            const data = await response.json();
            
            if (!response.ok) {
                alert(`Error: ${data.error}`);
            } else {
                alert("Invitation sent successfully!");
            }
        } catch (error) {
            console.error("Error inviting client:", error);
            alert("An unexpected error occurred.");
        }
    }

    const activeClients = clients.filter(c => c.status === 'Active').length
    const premiumClients = clients.filter(c => c.value_tier === 'Premium').length

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Premium Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-primary p-8 md:p-10 text-white shadow-2xl shadow-primary/30">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Building2 className="w-5 h-5 text-blue-200" />
                            <span className="text-sm font-medium text-blue-100 uppercase tracking-wider">Client Management</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">Clients</h1>
                        <p className="text-blue-100/80 text-lg">Manage your agency clients and their projects</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl hover:shadow-lg hover:bg-blue-50 active:scale-[0.98] transition-all duration-200 font-bold shadow-lg"
                    >
                        <UserPlus className="w-5 h-5" />
                        Add Client
                    </button>
                </div>

                {/* Quick Stats in Hero */}
                <div className="relative z-10 grid grid-cols-3 gap-4 mt-8">
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center">
                        <p className="text-3xl font-bold">{clients.length}</p>
                        <p className="text-sm text-blue-100/80">Total Clients</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center">
                        <p className="text-3xl font-bold">{activeClients}</p>
                        <p className="text-sm text-blue-100/80">Active</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 border border-white/20 text-center">
                        <p className="text-3xl font-bold">{premiumClients}</p>
                        <p className="text-sm text-blue-100/80">Premium</p>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search clients by name or business..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-lg shadow-lg shadow-black/5"
                />
            </div>

            {/* Clients Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 gap-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                        <p className="text-muted-foreground">Loading clients...</p>
                    </div>
                ) : filteredClients.length === 0 ? (
                    <div className="col-span-full text-center py-16">
                        <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">No clients found</h3>
                        <p className="text-muted-foreground">Add your first client to get started</p>
                    </div>
                ) : (
                    filteredClients.map(client => (
                        <div
                            key={client.id}
                            className="group relative bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="absolute top-4 right-4 flex items-center gap-1">
                                {/* Invite Button */}
                                <button
                                    onClick={() => handleInvite(client.id)}
                                    className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-colors"
                                    title="Invite to Client Portal"
                                >
                                    <Key className="w-4 h-4" />
                                </button>

                                {/* Edit Button */}
                                <button
                                    onClick={() => handleEditClick(client)}
                                    className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors"
                                    title="Edit Client"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Client Header */}
                            <div className="flex items-start gap-4 mb-4 pr-8">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg
                                    ${client.type === 'dev' ? 'bg-blue-500 shadow-blue-500/30' :
                                        client.type === 'design' ? 'bg-purple-500 shadow-purple-500/30' :
                                            client.type === 'marketing' ? 'bg-pink-500 shadow-pink-500/30' :
                                                'bg-slate-500 shadow-slate-500/30'}`}
                                >
                                    <Users className="w-6 h-6" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-lg text-foreground truncate">{client.name}</h3>
                                    {client.business_name && <p className="text-sm text-muted-foreground truncate">{client.business_name}</p>}
                                </div>
                            </div>

                            {/* Status Badge */}
                            <div className="mb-4">
                                <span className={`inline-flex px-3 py-1 text-xs rounded-full font-semibold
                                    ${client.status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' :
                                        client.status === 'Lead' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                                    {client.status}
                                </span>
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-2 text-sm text-muted-foreground mb-4">
                                {client.email && (
                                    <div className="flex items-center gap-2 truncate">
                                        <Mail className="w-4 h-4 shrink-0 text-blue-500" />
                                        <span className="truncate">{client.email}</span>
                                    </div>
                                )}
                                {client.phone && (
                                    <div className="flex items-center gap-2 truncate">
                                        <Phone className="w-4 h-4 shrink-0 text-emerald-500" />
                                        <span className="truncate">{client.phone}</span>
                                    </div>
                                )}
                                {client.location && (
                                    <div className="flex items-center gap-2 truncate">
                                        <MapPin className="w-4 h-4 shrink-0 text-rose-500" />
                                        <span className="truncate">{client.location}</span>
                                    </div>
                                )}
                            </div>

                            {/* Social Links & Premium Badge */}
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex gap-3">
                                    {client.social_links?.website && (
                                        <a href={client.social_links.website} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-500 transition-colors">
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
                                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-semibold">
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
