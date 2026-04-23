import { createAdminClient } from "@/lib/supabase/admin"

export const GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/userinfo.email",
].join(" ")

export function getGoogleConfig() {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
        throw new Error("Google OAuth env vars missing (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI)")
    }
    return { clientId, clientSecret, redirectUri }
}

export function buildAuthUrl(state: string) {
    const { clientId, redirectUri } = getGoogleConfig()
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: GOOGLE_SCOPES,
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
        state,
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string) {
    const { clientId, clientSecret, redirectUri } = getGoogleConfig()
    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
        }),
    })
    if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`)
    return res.json() as Promise<{
        access_token: string
        refresh_token?: string
        expires_in: number
        token_type: string
        scope: string
    }>
}

async function refreshAccessToken(refreshToken: string) {
    const { clientId, clientSecret } = getGoogleConfig()
    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
        }),
    })
    if (!res.ok) throw new Error(`Refresh failed: ${await res.text()}`)
    return res.json() as Promise<{ access_token: string; expires_in: number }>
}

export async function getUserEmail(accessToken: string) {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.email as string | undefined
}

// Returns a valid access token, refreshing if needed. Throws if no connection exists.
export async function getAccessToken(): Promise<string> {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
        .from("integration_credentials")
        .select("refresh_token, access_token, expires_at")
        .eq("provider", "google_drive")
        .single()

    if (error || !data) throw new Error("Google Drive is not connected")

    const now = Date.now()
    const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0

    // 60s buffer
    if (data.access_token && expiresAt - 60_000 > now) {
        return data.access_token
    }

    const refreshed = await refreshAccessToken(data.refresh_token)
    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()

    await supabase
        .from("integration_credentials")
        .update({
            access_token: refreshed.access_token,
            expires_at: newExpiresAt,
            updated_at: new Date().toISOString(),
        })
        .eq("provider", "google_drive")

    return refreshed.access_token
}

export type DriveFile = {
    id: string
    name: string
    mimeType: string
    iconLink?: string
    thumbnailLink?: string
    webViewLink?: string
    size?: string
    modifiedTime?: string
    parents?: string[]
}

export async function driveList(parentId: string | null, search?: string): Promise<DriveFile[]> {
    const token = await getAccessToken()

    const qParts: string[] = ["trashed = false"]
    if (parentId) qParts.push(`'${parentId}' in parents`)
    else qParts.push(`'root' in parents`)
    if (search && search.trim()) qParts.push(`name contains '${search.replace(/'/g, "\\'")}'`)

    const params = new URLSearchParams({
        q: qParts.join(" and "),
        fields: "files(id,name,mimeType,iconLink,thumbnailLink,webViewLink,size,modifiedTime,parents)",
        pageSize: "200",
        orderBy: "folder,name",
    })

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Drive list failed: ${await res.text()}`)
    const data = await res.json()
    return data.files || []
}

export async function driveGetMeta(fileId: string): Promise<DriveFile> {
    const token = await getAccessToken()
    const params = new URLSearchParams({
        fields: "id,name,mimeType,iconLink,webViewLink,size,modifiedTime,parents",
    })
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Drive file fetch failed: ${await res.text()}`)
    return res.json()
}
