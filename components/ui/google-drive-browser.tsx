"use client"

import { useCallback, useEffect, useState } from "react"
import { Folder, Search, ArrowLeft, Download, ExternalLink, FileText, Image as ImageIcon, FileSpreadsheet, Presentation, FileVideo, FileAudio, Loader2, Unplug, X } from "lucide-react"

type DriveFile = {
    id: string
    name: string
    mimeType: string
    iconLink?: string
    thumbnailLink?: string
    webViewLink?: string
    size?: string
    modifiedTime?: string
}

type Status = { connected: boolean; account_email: string | null; connected_at: string | null }

const SHEET_MIME = "application/vnd.google-apps.spreadsheet"
const DOC_MIME = "application/vnd.google-apps.document"
const SLIDES_MIME = "application/vnd.google-apps.presentation"
const FOLDER_MIME = "application/vnd.google-apps.folder"

function getIcon(file: DriveFile) {
    if (file.mimeType === FOLDER_MIME) return <Folder className="w-8 h-8 text-emerald-700 dark:text-emerald-400" fill="currentColor" fillOpacity={0.15} />
    if (file.mimeType === SHEET_MIME) return <FileSpreadsheet className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
    if (file.mimeType === DOC_MIME) return <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
    if (file.mimeType === SLIDES_MIME) return <Presentation className="w-8 h-8 text-amber-600 dark:text-amber-400" />
    if (file.mimeType.startsWith("image/")) return <ImageIcon className="w-8 h-8 text-violet-600 dark:text-violet-400" />
    if (file.mimeType.startsWith("video/")) return <FileVideo className="w-8 h-8 text-rose-600 dark:text-rose-400" />
    if (file.mimeType.startsWith("audio/")) return <FileAudio className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
    return <FileText className="w-8 h-8 text-slate-400 dark:text-slate-500" />
}

function formatSize(bytes?: string) {
    if (!bytes) return "--"
    const n = parseInt(bytes, 10)
    if (n < 1024) return n + " B"
    if (n < 1048576) return (n / 1024).toFixed(1) + " KB"
    if (n < 1073741824) return (n / 1048576).toFixed(1) + " MB"
    return (n / 1073741824).toFixed(1) + " GB"
}

interface Props {
    isAdmin: boolean
}

export function GoogleDriveBrowser({ isAdmin }: Props) {
    const [status, setStatus] = useState<Status | null>(null)
    const [statusLoading, setStatusLoading] = useState(true)
    const [files, setFiles] = useState<DriveFile[]>([])
    const [loading, setLoading] = useState(false)
    const [folderHistory, setFolderHistory] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "My Drive" }])
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [sheetPreview, setSheetPreview] = useState<DriveFile | null>(null)

    const fetchStatus = useCallback(async () => {
        setStatusLoading(true)
        try {
            const res = await fetch("/api/integrations/google/status")
            if (res.ok) setStatus(await res.json())
        } catch (e) { console.error(e) } finally {
            setStatusLoading(false)
        }
    }, [])

    const fetchFiles = useCallback(async (parentId: string | null) => {
        setLoading(true)
        try {
            const url = new URL("/api/drive/list", window.location.origin)
            if (parentId) url.searchParams.set("parent_id", parentId)
            const res = await fetch(url.toString())
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || "Failed to load")
            }
            setFiles(await res.json())
        } catch (e: any) {
            console.error(e)
            alert(e.message)
        } finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchStatus() }, [fetchStatus])

    useEffect(() => {
        if (status?.connected) fetchFiles(currentFolderId)
    }, [status?.connected, currentFolderId, fetchFiles])

    const handleConnect = () => { window.location.href = "/api/integrations/google/connect" }

    const handleDisconnect = async () => {
        if (!confirm("Disconnect Google Drive? Everyone in the app will lose access until reconnected.")) return
        try {
            const res = await fetch("/api/integrations/google/disconnect", { method: "POST" })
            if (!res.ok) throw new Error((await res.json()).error)
            setStatus({ connected: false, account_email: null, connected_at: null })
            setFiles([])
        } catch (e: any) { alert(e.message) }
    }

    const handleOpen = (file: DriveFile) => {
        if (file.mimeType === FOLDER_MIME) {
            setFolderHistory(prev => [...prev, { id: file.id, name: file.name }])
            setCurrentFolderId(file.id)
            return
        }
        if (file.mimeType === SHEET_MIME) {
            setSheetPreview(file)
            return
        }
        if (file.webViewLink) window.open(file.webViewLink, "_blank")
    }

    const handleDownload = (file: DriveFile) => {
        window.location.href = `/api/drive/file/${file.id}?download=1`
    }

    const handleNavigateUp = () => {
        if (folderHistory.length <= 1) return
        const next = folderHistory.slice(0, -1)
        setFolderHistory(next)
        setCurrentFolderId(next[next.length - 1].id)
    }

    const handleNavigateToCrumb = (idx: number) => {
        const next = folderHistory.slice(0, idx + 1)
        setFolderHistory(next)
        setCurrentFolderId(next[next.length - 1].id)
    }

    const filtered = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))

    if (statusLoading) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-10 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
        )
    }

    if (!status?.connected) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
                <div className="w-14 h-14 mx-auto rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-4">
                    <svg viewBox="0 0 87.3 78" className="w-7 h-7">
                        <path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" />
                        <path fill="#00ac47" d="M43.65 25 30.15 1.65c-1.35.8-2.5 1.9-3.3 3.3l-25 43.3A9.06 9.06 0 0 0 .6 52.5h27.45z" />
                        <path fill="#ea4335" d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.798l5.852 11.5z" />
                        <path fill="#00832d" d="M43.65 25 57.15 1.65c-1.35-.8-2.9-1.2-4.5-1.2h-18c-1.6 0-3.15.45-4.5 1.2z" />
                        <path fill="#2684fc" d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" />
                        <path fill="#ffba00" d="M73.4 26.5 60.9 4.95c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.4c0-1.55-.4-3.1-1.2-4.5z" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Google Drive not connected</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
                    {isAdmin
                        ? "Sign in with the company Gmail to mount its Drive here. Everyone in the app will be able to browse these files."
                        : "An admin needs to connect the company Gmail to enable this. Ask an administrator to set it up."}
                </p>
                {isAdmin && (
                    <button onClick={handleConnect} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold rounded-lg shadow-sm transition-colors">
                        <svg viewBox="0 0 24 24" className="w-4 h-4">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Sign in with Google
                    </button>
                )}
            </div>
        )
    }

    return (
        <>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[calc(100vh-180px)]">
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-center">
                    <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap pb-1 sm:pb-0">
                        {folderHistory.length > 1 && (
                            <button onClick={handleNavigateUp} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500 dark:text-slate-400 transition-colors">
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        {folderHistory.map((crumb, idx) => (
                            <div key={`${crumb.id}-${idx}`} className="flex items-center shrink-0">
                                <button onClick={() => handleNavigateToCrumb(idx)} className={`hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors ${idx === folderHistory.length - 1 ? "text-slate-900 dark:text-white font-semibold" : ""}`}>
                                    {crumb.name}
                                </button>
                                {idx < folderHistory.length - 1 && <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>}
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-grow sm:flex-grow-0">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search in folder..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full sm:w-56 pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                        </div>
                        {isAdmin && (
                            <button onClick={handleDisconnect} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors" title={`Connected as ${status.account_email}`}>
                                <Unplug className="w-3.5 h-3.5" /> Disconnect
                            </button>
                        )}
                    </div>
                </div>

                {status.account_email && (
                    <div className="px-4 py-2 text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
                        Connected as <span className="font-medium text-slate-700 dark:text-slate-300">{status.account_email}</span>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-transparent">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                            <p className="text-sm text-slate-500 dark:text-slate-400">Loading files...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                                {searchQuery ? <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" /> : <Folder className="w-8 h-8 text-slate-300 dark:text-slate-600" />}
                            </div>
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                                {searchQuery ? "No results found" : "This folder is empty"}
                            </h3>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {filtered.map(file => (
                                <div
                                    key={file.id}
                                    className="group relative bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-700 transition-colors cursor-pointer"
                                    onDoubleClick={() => handleOpen(file)}
                                >
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                                        {file.mimeType !== FOLDER_MIME && file.webViewLink && (
                                            <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors" title="Open in Google">
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        )}
                                        {file.mimeType !== FOLDER_MIME && (
                                            <button onClick={() => handleDownload(file)} className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors" title="Download">
                                                <Download className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-center justify-center text-center space-y-2 pt-2">
                                        {getIcon(file)}
                                        <div className="w-full">
                                            <p className="font-medium text-slate-900 dark:text-white text-sm truncate px-1" title={file.name}>
                                                {file.name}
                                            </p>
                                            <div className="flex items-center justify-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                                {file.mimeType !== FOLDER_MIME && file.size && <span>{formatSize(file.size)}</span>}
                                                {file.mimeType !== FOLDER_MIME && file.size && <span>·</span>}
                                                {file.modifiedTime && <span>{new Date(file.modifiedTime).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {sheetPreview && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-6xl h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2 min-w-0">
                                <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                                <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">{sheetPreview.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {sheetPreview.webViewLink && (
                                    <a href={sheetPreview.webViewLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800">
                                        <ExternalLink className="w-3.5 h-3.5" /> Open in Sheets
                                    </a>
                                )}
                                <button onClick={() => setSheetPreview(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">
                                    <X className="w-4 h-4 text-slate-500" />
                                </button>
                            </div>
                        </div>
                        <iframe
                            src={`https://docs.google.com/spreadsheets/d/${sheetPreview.id}/edit?rm=embedded`}
                            className="flex-1 w-full"
                            title={sheetPreview.name}
                        />
                    </div>
                </div>
            )}
        </>
    )
}
