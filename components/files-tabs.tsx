"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileBrowser } from "@/components/ui/file-browser"
import { GoogleDriveBrowser } from "@/components/ui/google-drive-browser"
import { HardDrive } from "lucide-react"
import { toast } from "sonner"

interface Props { isAdmin: boolean }

export function FilesTabs({ isAdmin }: Props) {
    const [tab, setTab] = useState<string>("company")

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        if (params.get("tab") === "gdrive") setTab("gdrive")
        if (params.get("connected") === "1") toast.success("Google Drive connected")
        const err = params.get("drive_error")
        if (err) toast.error(`Google Drive: ${err}`)
    }, [])

    return (
        <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="mb-4">
                <TabsTrigger value="company" className="gap-2">
                    <HardDrive className="w-4 h-4" /> Company Drive
                </TabsTrigger>
                <TabsTrigger value="gdrive" className="gap-2">
                    <svg viewBox="0 0 87.3 78" className="w-4 h-4">
                        <path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" />
                        <path fill="#00ac47" d="M43.65 25 30.15 1.65c-1.35.8-2.5 1.9-3.3 3.3l-25 43.3A9.06 9.06 0 0 0 .6 52.5h27.45z" />
                        <path fill="#ea4335" d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.798l5.852 11.5z" />
                        <path fill="#00832d" d="M43.65 25 57.15 1.65c-1.35-.8-2.9-1.2-4.5-1.2h-18c-1.6 0-3.15.45-4.5 1.2z" />
                        <path fill="#2684fc" d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" />
                        <path fill="#ffba00" d="M73.4 26.5 60.9 4.95c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.4c0-1.55-.4-3.1-1.2-4.5z" />
                    </svg>
                    Google Drive
                </TabsTrigger>
            </TabsList>
            <TabsContent value="company" className="mt-0">
                <FileBrowser />
            </TabsContent>
            <TabsContent value="gdrive" className="mt-0">
                <GoogleDriveBrowser isAdmin={isAdmin} />
            </TabsContent>
        </Tabs>
    )
}
