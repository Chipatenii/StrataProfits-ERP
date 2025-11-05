"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export async function createAdminUser() {
  try {
    const supabase = await createAdminClient()

    // Check if admin already exists
    const { data: existingAdmin, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .limit(1)

    if (checkError) {
      return { success: false, error: "Failed to check existing admins" }
    }

    if (existingAdmin && existingAdmin.length > 0) {
      return { success: false, error: "Admin user already exists" }
    }

    // Create auth user with valid email format
    const { data, error } = await supabase.auth.admin.createUser({
      email: "admin@ostento.com",
      password: "1234",
      email_confirm: true,
      user_metadata: {
        full_name: "Admin",
      },
    })

    if (error) {
      return { success: false, error: error.message }
    }

    // Update profile to admin role
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: "admin", full_name: "Admin" })
      .eq("id", data.user.id)

    if (updateError) {
      return { success: false, error: "Failed to set admin role" }
    }

    return {
      success: true,
      email: "admin@ostento.com",
      password: "1234",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}
