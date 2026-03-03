import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

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

    // First check who is the author of the comment and who is the user
    // RLS will also double-check this, but it's good practice for clear error messages
    const { data: comment, error: fetchError } = await supabase
      .from("comments")
      .select("author_user_id")
      .eq("id", id)
      .single()

    if (fetchError || !comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    // Only allow deletion if the user is the author or an admin
    if (comment.author_user_id !== session.user.id && profile?.role !== "admin") {
      return NextResponse.json(
        { error: "You do not have permission to delete this comment" },
        { status: 403 }
      )
    }

    const { error: deleteError } = await supabase
      .from("comments")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Error deleting comment:", deleteError)
      return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unexpected error in comment DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
