import { createClient } from "@/lib/supabase/server"
import { driveGetMeta, getAccessToken } from "@/lib/google/drive"
import { NextRequest, NextResponse } from "next/server"

// GET /api/drive/file/:id?download=1 — metadata by default; streams file bytes if ?download=1
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
        if (profile?.role === "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

        const { id } = await params
        const { searchParams } = new URL(request.url)
        const wantsDownload = searchParams.get("download") === "1"

        if (!wantsDownload) {
            const meta = await driveGetMeta(id)
            return NextResponse.json(meta)
        }

        // Stream the file bytes through our server (keeps Google token private).
        const token = await getAccessToken()
        const meta = await driveGetMeta(id)

        // Google Workspace docs (Doc/Sheet/Slide) need export, not alt=media.
        const exportMap: Record<string, string> = {
            "application/vnd.google-apps.document": "application/pdf",
            "application/vnd.google-apps.spreadsheet": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.google-apps.presentation": "application/pdf",
            "application/vnd.google-apps.drawing": "application/pdf",
        }
        const exportMime = exportMap[meta.mimeType]

        const url = exportMime
            ? `https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=${encodeURIComponent(exportMime)}`
            : `https://www.googleapis.com/drive/v3/files/${id}?alt=media`

        const upstream = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        if (!upstream.ok || !upstream.body) {
            return NextResponse.json({ error: "Download failed" }, { status: 500 })
        }

        const ext = exportMime === "application/pdf" ? ".pdf"
            : exportMime?.includes("spreadsheetml") ? ".xlsx"
            : ""
        const filename = exportMime ? `${meta.name}${ext}` : meta.name

        return new NextResponse(upstream.body, {
            headers: {
                "Content-Type": exportMime || upstream.headers.get("content-type") || "application/octet-stream",
                "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
            },
        })
    } catch (e: any) {
        console.error("Drive file error:", e)
        return NextResponse.json({ error: e.message || "Failed" }, { status: 500 })
    }
}
