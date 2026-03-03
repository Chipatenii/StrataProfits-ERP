import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
    
    // 1. Verify caller is an admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = await createAdminClient()
    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (callerProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden. Admins only." }, { status: 403 })
    }

    // 2. Fetch the client details to get their email
    const { data: clientData, error: clientError } = await admin
      .from("clients")
      .select("email, name")
      .eq("id", clientId)
      .single()

    if (clientError || !clientData) {
      return NextResponse.json({ error: "Client not found or database error" }, { status: 404 })
    }

    if (!clientData.email) {
      return NextResponse.json({ error: "Client does not have an email address on file. Please update their profile first." }, { status: 400 })
    }

    // 3. Send Invitation via Supabase Auth Admin
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      clientData.email,
      {
        data: {
          full_name: clientData.name, // Pass the name so triggers or emails can use it
        }
      }
    )

    if (inviteError) {
      console.error("Error sending invite:", inviteError)
      
      // If the user already exists in auth.users, inviteError might just mean they are already signed up. 
      // We can try to fetch them and just forcefully update the profile, but for safety, we return the error.
      return NextResponse.json({ error: `Failed to invite user: ${inviteError.message}` }, { status: 500 })
    }

    // 4. Upsert the Profile record as a 'client' role
    // Sometimes database triggers create a profile automatically when a user is invited.
    // We execute an upsert just in case, or to forcefully stitch their generated auth ID to our specific client ID.
    if (inviteData?.user?.id) {
        const { error: profileError } = await admin
            .from("profiles")
            .upsert({
                id: inviteData.user.id,
                full_name: clientData.name,
                email: clientData.email,
                role: "client",
                client_id: clientId,
            }, { onConflict: "id" })

        if (profileError) {
            console.error("Error creating/updating client profile:", profileError)
            return NextResponse.json({ error: "Invited user but failed to configure their client profile permissions." }, { status: 500 })
        }
    }

    return NextResponse.json({
        success: true,
        message: "Invitation sent successfully!",
        user: inviteData?.user
    })

  } catch (error) {
    console.error("Unexpected error in client invite POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
