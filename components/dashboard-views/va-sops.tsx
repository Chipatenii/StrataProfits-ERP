"use client"

import { useState, useEffect } from "react"
import { Book, Plus, Search, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { SOP } from "@/lib/types"

export function VASOPs() {
    const [sops, setSops] = useState<SOP[]>([])
    const [search, setSearch] = useState("")
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newSOP, setNewSOP] = useState({ title: "", content: "", category: "General" })
    const [selectedSOP, setSelectedSOP] = useState<SOP | null>(null)

    useEffect(() => {
        fetchSOPs()
    }, [])

    const fetchSOPs = async () => {
        try {
            const res = await fetch('/api/sops')
            if (res.ok) setSops(await res.json())
        } catch (e) { console.error(e) }
    }

    const handleCreate = async () => {
        try {
            const res = await fetch('/api/sops', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSOP)
            })
            if (res.ok) {
                setIsCreateOpen(false)
                setNewSOP({ title: "", content: "", category: "General" })
                fetchSOPs()
            }
        } catch (e) { console.error(e) }
    }

    const filteredSops = sops.filter(s => s.title.toLowerCase().includes(search.toLowerCase()) || s.content?.toLowerCase().includes(search.toLowerCase()))

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Premium Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 p-8 md:p-10 text-white shadow-2xl shadow-indigo-500/30">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Book className="w-5 h-5 text-indigo-200" />
                            <span className="text-sm font-medium text-indigo-100 uppercase tracking-wider">Knowledge Base</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">Standard Operating Procedures</h1>
                        <p className="text-indigo-100/80 text-lg">Documents, guidelines, and processes</p>
                    </div>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-white text-indigo-600 hover:bg-indigo-50 hover:shadow-lg transition-all duration-200 shadow-md font-bold text-base px-6 py-5 rounded-xl border-none">
                                <Plus className="w-5 h-5 mr-2" />
                                New SOP
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl bg-card rounded-2xl shadow-2xl border border-border/50">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold">Create SOP</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Title</label>
                                    <Input
                                        placeholder="e.g., Client Onboarding Process"
                                        value={newSOP.title}
                                        onChange={e => setNewSOP({ ...newSOP, title: e.target.value })}
                                        className="rounded-xl border-slate-200 dark:border-slate-800"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Category</label>
                                    <Input
                                        placeholder="e.g., Sales, HR, Tech"
                                        value={newSOP.category}
                                        onChange={e => setNewSOP({ ...newSOP, category: e.target.value })}
                                        className="rounded-xl border-slate-200 dark:border-slate-800"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Content (Markdown supported)</label>
                                    <textarea
                                        className="w-full min-h-[300px] p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-sm bg-background focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none resize-y"
                                        placeholder="# Procedure Title\n\n1. First step...\n2. Second step..."
                                        value={newSOP.content}
                                        onChange={e => setNewSOP({ ...newSOP, content: e.target.value })}
                                    />
                                </div>
                                <div className="pt-2 flex justify-end">
                                    <Button
                                        onClick={handleCreate}
                                        disabled={!newSOP.title}
                                        className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl px-8"
                                    >
                                        Save SOP
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground" />
                <Input
                    placeholder="Search procedures..."
                    className="pl-12 h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-base"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredSops.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-foreground">No SOPs found</h3>
                        <p className="text-muted-foreground">Try adjusting your search or create a new one.</p>
                    </div>
                ) : (
                    filteredSops.map(sop => (
                        <div
                            key={sop.id}
                            onClick={() => setSelectedSOP(sop)}
                            className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-800 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                        >
                            <div className="flex items-center justify-between gap-2 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                                    <Book className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
                                    {sop.category}
                                </span>
                            </div>
                            <h3 className="font-bold text-lg mb-2 text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{sop.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                                {sop.content}
                            </p>
                        </div>
                    ))
                )}
            </div>

            {/* View Modal */}
            <Dialog open={!!selectedSOP} onOpenChange={(o) => !o && setSelectedSOP(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-card rounded-2xl shadow-2xl">
                    <DialogHeader className="border-b border-border/50 pb-4">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md">
                                {selectedSOP?.category}
                            </span>
                        </div>
                        <DialogTitle className="text-3xl font-bold">{selectedSOP?.title}</DialogTitle>
                    </DialogHeader>
                    <div className="py-6 prose prose-slate dark:prose-invert max-w-none">
                        <div className="whitespace-pre-wrap font-sans text-base leading-relaxed">
                            {selectedSOP?.content}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
