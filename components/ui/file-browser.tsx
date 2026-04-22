"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { CompanyFile } from "@/lib/types"
import { Folder, Upload, Search, Plus, Trash2, ArrowLeft, Image as ImageIcon, FileText, Download } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface FileBrowserProps {
  initialParentId?: string | null
}

export function FileBrowser({ initialParentId = null }: FileBrowserProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(initialParentId)
  const [folderHistory, setFolderHistory] = useState<{ id: string | null, name: string }[]>([{ id: null, name: "Company Drive" }])
  const [files, setFiles] = useState<CompanyFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const fetchFiles = useCallback(async (parentId: string | null) => {
    setLoading(true)
    try {
      const url = new URL("/api/files", window.location.origin)
      if (parentId) url.searchParams.set("parent_id", parentId)

      const response = await fetch(url.toString())
      if (!response.ok) throw new Error("Failed to fetch files")
      const data = await response.json()
      setFiles(data)
    } catch (error) {
      console.error(error)
      alert("Error loading files.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFiles(currentFolderId)
  }, [currentFolderId, fetchFiles])

  const handleNavigate = (folder: CompanyFile) => {
    if (folder.type !== "folder") return
    setFolderHistory(prev => [...prev, { id: folder.id, name: folder.name }])
    setCurrentFolderId(folder.id)
  }

  const handleNavigateUp = () => {
    if (folderHistory.length <= 1) return
    const newHistory = [...folderHistory]
    newHistory.pop()
    const previous = newHistory[newHistory.length - 1]

    setFolderHistory(newHistory)
    setCurrentFolderId(previous.id)
  }

  const handleNavigateToCrumb = (index: number) => {
    const target = folderHistory[index]
    const newHistory = folderHistory.slice(0, index + 1)
    setFolderHistory(newHistory)
    setCurrentFolderId(target.id)
  }

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim()) return

    try {
      const response = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          type: "folder",
          parent_id: currentFolderId,
        })
      })

      if (!response.ok) throw new Error("Failed to create folder")

      setNewFolderName("")
      setShowNewFolderModal(false)
      fetchFiles(currentFolderId)
    } catch (error) {
      console.error(error)
      alert("Error creating folder.")
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    setUploading(true)

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      try {
        const fileExt = file.name.split(".").pop()
        const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`
        const storagePath = currentFolderId ? `${currentFolderId}/${uniqueName}` : `root/${uniqueName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("company-files")
          .upload(storagePath, file)

        if (uploadError) throw uploadError

        const response = await fetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            type: "file",
            parent_id: currentFolderId,
            file_path: uploadData.path,
            size_bytes: file.size,
            mime_type: file.type
          })
        })

        if (!response.ok) throw new Error("Failed to track file metadata")

      } catch (error) {
        console.error("Upload error:", error)
        alert(`Failed to upload ${file.name}`)
      }
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
    fetchFiles(currentFolderId)
  }

  const handleDelete = async (file: CompanyFile) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) return

    try {
      const response = await fetch(`/api/files/${file.id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete")
      fetchFiles(currentFolderId)
    } catch (error) {
      console.error(error)
      alert("Error deleting item.")
    }
  }

  const handleDownload = async (file: CompanyFile) => {
    if (file.type !== "file" || !file.file_path) return

    try {
      const { data, error } = await supabase.storage
        .from("company-files")
        .createSignedUrl(file.file_path, 60 * 60)

      if (error) throw error

      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank")
      }
    } catch (err) {
      console.error("Download error:", err)
      alert("Failed to generate download link.")
    }
  }

  const getFileIcon = (file: CompanyFile) => {
    if (file.type === "folder") return <Folder className="w-8 h-8 text-emerald-700 dark:text-emerald-400" fill="currentColor" fillOpacity={0.15} />
    if (file.mime_type?.startsWith("image/")) return <ImageIcon className="w-8 h-8 text-emerald-700 dark:text-emerald-400" />
    return <FileText className="w-8 h-8 text-slate-400 dark:text-slate-500" />
  }

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "--"
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / 1048576).toFixed(1) + " MB"
  }

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto text-sm font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap pb-1 sm:pb-0">
          {folderHistory.length > 1 && (
            <button onClick={handleNavigateUp} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-slate-500 dark:text-slate-400 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          {folderHistory.map((crumb, idx) => (
            <div key={`${crumb.id}-${idx}`} className="flex items-center shrink-0">
              <button
                onClick={() => handleNavigateToCrumb(idx)}
                className={`hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors ${idx === folderHistory.length - 1 ? "text-slate-900 dark:text-white font-semibold" : ""}`}
              >
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

          <button
            onClick={() => setShowNewFolderModal(true)}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" /> Folder
          </button>

          <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors cursor-pointer">
            {uploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            ) : <Upload className="w-4 h-4" />}
            <span className="hidden sm:inline">{uploading ? "Uploading..." : "Upload"}</span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
              ref={fileInputRef}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-transparent">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent"></div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading files...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
              {searchQuery ? <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" /> : <Folder className="w-8 h-8 text-slate-300 dark:text-slate-600" />}
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {searchQuery ? "No results found" : "This folder is empty"}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              {searchQuery ? `We couldn't find anything matching "${searchQuery}"` : "Use the Upload button to add files to your company drive."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowNewFolderModal(true)}
                className="text-emerald-700 dark:text-emerald-400 font-semibold hover:text-emerald-800 dark:hover:text-emerald-300 text-sm"
              >
                Create a new folder
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredFiles.map(file => (
              <div
                key={file.id}
                className="group relative bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-700 transition-colors cursor-pointer"
                onDoubleClick={() => file.type === "folder" ? handleNavigate(file) : handleDownload(file)}
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                  {file.type === "file" && (
                    <button onClick={() => handleDownload(file)} className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => handleDelete(file)} className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-col items-center justify-center text-center space-y-2 pt-2">
                  {getFileIcon(file)}
                  <div className="w-full">
                    <p className="font-medium text-slate-900 dark:text-white text-sm truncate px-1" title={file.name}>
                      {file.name}
                    </p>
                    <div className="flex items-center justify-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {file.type === "file" && <span>{formatSize(file.size_bytes)}</span>}
                      {file.type === "file" && <span>·</span>}
                      <span>{new Date(file.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNewFolderModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Create Folder</h3>
            <form onSubmit={handleCreateFolder}>
              <input
                autoFocus
                type="text"
                placeholder="Folder name"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 mb-4"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
