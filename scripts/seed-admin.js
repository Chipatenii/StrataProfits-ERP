import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD

if (!supabaseUrl || !supabaseServiceKey || !defaultPassword) {
  console.error("Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DEFAULT_ADMIN_PASSWORD environment variables")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function seedAdmin() {
  try {
    console.log("Checking if admin user already exists...")

    // Check if admin user already exists
    const { data: existingAdmin } = await supabase.from("profiles").select("id").eq("role", "admin").limit(1)

    if (existingAdmin && existingAdmin.length > 0) {
      console.log("Admin user already exists. Skipping seed.")
      process.exit(0)
    }

    console.log(`Creating default admin user with email 'admin@ostento.com' and password '${defaultPassword}'...`)

    // Create auth user
    const { data, error } = await supabase.auth.admin.createUser({
      email: "admin@ostento.com",
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        full_name: "Admin",
      },
    })

    if (error) {
      console.error("Error creating auth user:", error)
      process.exit(1)
    }

    console.log("Auth user created:", data.user.id)

    // Update profile to admin role
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: "admin", full_name: "Admin" })
      .eq("id", data.user.id)

    if (updateError) {
      console.error("Error updating profile to admin:", updateError)
      process.exit(1)
    }

    console.log("Default admin user seeded successfully!")
    console.log("Email: admin@ostento.com")
    console.log(`Password: ${defaultPassword}`)
    process.exit(0)
  } catch (error) {
    console.error("Unexpected error:", error)
    process.exit(1)
  }
}

seedAdmin()
