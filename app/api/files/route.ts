import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// GET files and folders. Optional parent_id to fetch specific folder contents.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get("parent_id")

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Role check prevents clients from accessing this via API
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role === "client") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let query = supabase
      .from("company_files")
      .select(`
        *,
        uploader:profiles!uploaded_by(full_name, avatar_url)
      `)
      .order("type", { ascending: false }) // Folders first
      .order("name", { ascending: true })

    if (parentId) {
      query = query.eq("parent_id", parentId)
    } else {
      query = query.is("parent_id", null)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching company files:", error)
      return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Unexpected error in files GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST to create a new folder OR record a newly uploaded file
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Role check
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role === "client") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, type, parent_id, file_path, size_bytes, mime_type } = body

    if (!name || !type) {
      return NextResponse.json({ error: "Name and type are required" }, { status: 400 })
    }

    if (type !== "file" && type !== "folder") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }

    const newRecord = {
      name,
      type,
      parent_id: parent_id || null,
      file_path: type === "file" ? file_path : null,
      size_bytes: type === "file" ? size_bytes : null,
      mime_type: type === "file" ? mime_type : null,
      uploaded_by: user.id,
    }

    const { data, error } = await supabase
      .from("company_files")
      .insert(newRecord)
      .select(`
        *,
        uploader:profiles!uploaded_by(full_name, avatar_url)
      `)
      .single()

    if (error) {
      console.error("Error creating company file record:", error)
      return NextResponse.json({ error: "Failed to create record" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Unexpected error in files POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
