"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
    MessageSquare, X, Hash, Send, Plus, Loader2, Users, ChevronLeft
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface Channel {
    id: string
    name: string
    description: string | null
    is_dm: boolean
    members?: { user_id: string; user: { full_name: string; avatar_url: string | null } }[]
    last_message?: { content: string; created_at: string; sender: { full_name: string } } | null
    unread_count: number
}

interface Message {
    id: string
    channel_id: string
    sender_id: string
    content: string
    created_at: string
    sender?: { id: string; full_name: string; avatar_url: string | null; role: string }
}

interface ChatPanelProps {
    isOpen: boolean
    onClose: () => void
    userId: string
}

export function ChatPanel({ isOpen, onClose, userId }: ChatPanelProps) {
    const supabase = createClient()
    const [channels, setChannels] = useState<Channel[]>([])
    const [activeChannel, setActiveChannel] = useState<Channel | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [showNewChannel, setShowNewChannel] = useState(false)
    const [newChannelName, setNewChannelName] = useState("")
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Load channels
    const loadChannels = useCallback(async () => {
        try {
            const res = await fetch("/api/chat/channels")
            if (res.ok) setChannels(await res.json())
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }, [])

    useEffect(() => {
        if (isOpen) loadChannels()
    }, [isOpen, loadChannels])

    // Load messages when channel selected
    const loadMessages = useCallback(async (channelId: string) => {
        try {
            const res = await fetch(`/api/chat/messages?channel_id=${channelId}&limit=50`)
            if (res.ok) setMessages(await res.json())
        } catch (e) { console.error(e) }
    }, [])

    useEffect(() => {
        if (activeChannel) loadMessages(activeChannel.id)
    }, [activeChannel, loadMessages])

    // Real-time subscription
    useEffect(() => {
        if (!activeChannel) return

        const channel = supabase
            .channel(`chat-${activeChannel.id}`)
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "chat_messages",
                filter: `channel_id=eq.${activeChannel.id}`,
            }, async (payload) => {
                // Fetch full message with sender profile
                const { data } = await supabase
                    .from("chat_messages")
                    .select("*, sender:profiles!chat_messages_sender_id_fkey(id, full_name, avatar_url, role)")
                    .eq("id", (payload.new as any).id)
                    .single()
                if (data) {
                    setMessages(prev => [...prev, data as Message])
                }
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [activeChannel, supabase])

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const handleSend = async () => {
        if (!newMessage.trim() || !activeChannel || sending) return
        setSending(true)
        try {
            const res = await fetch("/api/chat/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channel_id: activeChannel.id, content: newMessage }),
            })
            if (res.ok) {
                setNewMessage("")
            } else toast.error("Failed to send message")
        } catch { toast.error("Network error") }
        finally { setSending(false) }
    }

    const handleCreateChannel = async () => {
        if (!newChannelName.trim()) return
        try {
            const res = await fetch("/api/chat/channels", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newChannelName.trim().toLowerCase().replace(/\s+/g, "-") }),
            })
            if (res.ok) {
                setNewChannelName("")
                setShowNewChannel(false)
                loadChannels()
                toast.success("Channel created!")
            }
        } catch { toast.error("Failed to create channel") }
    }

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr)
        const now = new Date()
        const isToday = d.toDateString() === now.toDateString()
        if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />

            {/* Panel */}
            <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-white dark:bg-slate-950 z-50 shadow-2xl flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-500 to-violet-600 text-white">
                    {activeChannel ? (
                        <button onClick={() => setActiveChannel(null)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <ChevronLeft className="w-5 h-5" />
                            <Hash className="w-4 h-4" />
                            <span className="font-semibold">{activeChannel.name}</span>
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" />
                            <span className="font-semibold text-lg">Chat</span>
                        </div>
                    )}
                    <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                {!activeChannel ? (
                    /* ── Channel List ── */
                    <div className="flex-1 overflow-y-auto">
                        {/* Create Channel */}
                        <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                            {showNewChannel ? (
                                <div className="flex items-center gap-2">
                                    <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <input
                                        type="text" value={newChannelName}
                                        onChange={e => setNewChannelName(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && handleCreateChannel()}
                                        placeholder="channel-name"
                                        className="flex-1 text-sm bg-transparent border-b border-slate-300 dark:border-slate-700 focus:border-indigo-500 focus:outline-none py-1 px-0"
                                        autoFocus
                                    />
                                    <button onClick={handleCreateChannel} className="text-indigo-600 text-sm font-semibold hover:text-indigo-700">Create</button>
                                    <button onClick={() => { setShowNewChannel(false); setNewChannelName("") }} className="text-muted-foreground text-sm">Cancel</button>
                                </div>
                            ) : (
                                <button onClick={() => setShowNewChannel(true)} className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 w-full py-1">
                                    <Plus className="w-4 h-4" /> New Channel
                                </button>
                            )}
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                            </div>
                        ) : channels.length === 0 ? (
                            <div className="text-center py-16 px-4">
                                <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">No channels yet. Create one to start chatting!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {channels.map(ch => (
                                    <button
                                        key={ch.id}
                                        onClick={() => setActiveChannel(ch)}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex items-start gap-3"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white shrink-0 mt-0.5">
                                            {ch.is_dm ? <Users className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-sm text-foreground">{ch.name}</span>
                                                {ch.unread_count > 0 && (
                                                    <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{ch.unread_count}</span>
                                                )}
                                            </div>
                                            {ch.last_message ? (
                                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                    <span className="font-medium">{ch.last_message.sender?.full_name}:</span> {ch.last_message.content}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-muted-foreground italic mt-0.5">No messages yet</p>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* ── Message Thread ── */
                    <>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.length === 0 ? (
                                <div className="text-center py-16">
                                    <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">No messages yet. Say hello! 👋</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isOwn = msg.sender_id === userId
                                    const showAvatar = idx === 0 || messages[idx - 1]?.sender_id !== msg.sender_id
                                    return (
                                        <div key={msg.id} className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}>
                                            {showAvatar ? (
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${isOwn ? "bg-indigo-500" : "bg-emerald-500"}`}>
                                                    {(msg.sender?.full_name || "?")[0]}
                                                </div>
                                            ) : <div className="w-7 shrink-0" />}
                                            <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
                                                {showAvatar && (
                                                    <p className={`text-[11px] font-semibold mb-0.5 ${isOwn ? "text-right text-indigo-600" : "text-emerald-600"}`}>
                                                        {msg.sender?.full_name || "Unknown"}
                                                    </p>
                                                )}
                                                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                                    isOwn
                                                        ? "bg-indigo-500 text-white rounded-tr-md"
                                                        : "bg-slate-100 dark:bg-slate-800 text-foreground rounded-tl-md"
                                                }`}>
                                                    {msg.content}
                                                </div>
                                                <p className={`text-[10px] text-muted-foreground mt-0.5 ${isOwn ? "text-right" : ""}`}>
                                                    {formatTime(msg.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Compose */}
                        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                                    placeholder={`Message #${activeChannel.name}...`}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-foreground"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!newMessage.trim() || sending}
                                    className="p-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    )
}
