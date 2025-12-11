"use client"

import { useState, useEffect } from "react"
import { Book, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea" // Assuming this exists or use Input for now
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
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Standard Operating Procedures</h2>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2"><Plus className="w-4 h-4" /> New SOP</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Create SOP</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <Input placeholder="Title" value={newSOP.title} onChange={e => setNewSOP({ ...newSOP, title: e.target.value })} />
                            <Input placeholder="Category" value={newSOP.category} onChange={e => setNewSOP({ ...newSOP, category: e.target.value })} />
                            <textarea
                                className="w-full min-h-[200px] p-3 rounded-md border text-sm"
                                placeholder="Write the procedure here (Markdown supported)..."
                                value={newSOP.content}
                                onChange={e => setNewSOP({ ...newSOP, content: e.target.value })}
                            />
                            <Button onClick={handleCreate} disabled={!newSOP.title}>Save SOP</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search procedures..."
                    className="pl-9"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredSops.map(sop => (
                    <div
                        key={sop.id}
                        onClick={() => setSelectedSOP(sop)}
                        className="glass-card p-6 rounded-xl hover:shadow-md transition-all cursor-pointer group"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Book className="w-4 h-4" />
                            </div>
                            <span className="text-xs text-muted-foreground px-2 py-1 bg-secondary rounded-full">
                                {sop.category}
                            </span>
                        </div>
                        <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">{sop.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                            {sop.content}
                        </p>
                    </div>
                ))}
            </div>

            {/* View Modal */}
            <Dialog open={!!selectedSOP} onOpenChange={(o) => !o && setSelectedSOP(null)}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedSOP?.title}</DialogTitle>
                        <p className="text-sm text-muted-foreground">{selectedSOP?.category}</p>
                    </DialogHeader>
                    <div className="py-4 prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap font-sans text-sm">{selectedSOP?.content}</pre>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
