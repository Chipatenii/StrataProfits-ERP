import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// DELETE a file or folder (Cascade happens at DB level for folders)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Role check
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (profile?.role === "client") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch to see if it's a file, we might need to delete from Storage too
    const { data: fileRecord, error: fetchError } = await supabase
      .from("company_files")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !fileRecord) {
      return NextResponse.json({ error: "File or folder not found" }, { status: 404 })
    }

    // Delete from DB (this cascades, but Supabase Storage doesn't cascade automatically.
    // For a production app, you might want to trigger an Edge Function to clean up Storage,
    // or manually walk the tree here if it's a folder. For now, we delete the DB record.
    const { error: deleteError } = await supabase
      .from("company_files")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Error deleting company file:", deleteError)
      return NextResponse.json({ error: "Failed to delete from database" }, { status: 500 })
    }

    // If it was a physical file, also remove it from the Storage Bucket
    if (fileRecord.type === "file" && fileRecord.file_path) {
      const { error: storageError } = await supabase
        .storage
        .from("company-files")
        .remove([fileRecord.file_path])

      if (storageError) {
        console.error("Deleted from DB but failed to delete from Storage:", storageError)
        // We still return success since the DB record is gone and it's invisible to the user.
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unexpected error in files DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH to rename a file/folder or move it
export async function PATCH(
  request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Role check
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (profile?.role === "client") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { name, parent_id } = body

    // We only allow updating name or parent_id (moving)
    const updates: Record<string, any> = {
        updated_at: new Date().toISOString()
    }
    
    if (name !== undefined) updates.name = name
    if (parent_id !== undefined) updates.parent_id = parent_id

    const { data, error } = await supabase
      .from("company_files")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating company file:", error)
      return NextResponse.json({ error: "Failed to update record" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Unexpected error in files PATCH:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
