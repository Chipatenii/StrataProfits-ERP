import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get("entityType")
    const entityId = searchParams.get("entityId")

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "entityType and entityId are required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch comments and join with profiles to get the author's details
    const { data, error } = await supabase
      .from("comments")
      .select(`
        *,
        author:profiles!author_user_id (
          full_name,
          avatar_url,
          role
        )
      `)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching comments:", error)
      return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Unexpected error in comments GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { entityType, entityId, content } = body

    if (!entityType || !entityId || !content) {
      return NextResponse.json(
        { error: "entityType, entityId, and content are required" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        content: content,
        author_user_id: session.user.id
      })
      .select(`
        *,
        author:profiles!author_user_id (
          full_name,
          avatar_url,
          role
        )
      `)
      .single()

    if (error) {
      console.error("Error creating comment:", error)
      return NextResponse.json({ error: "Failed to create comment" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Unexpected error in comments POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
