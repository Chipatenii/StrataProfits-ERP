import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

// Manually load environment variables from .env.local
const envPath = path.resolve(process.cwd(), ".env.local")
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8")
    envConfig.split("\n").forEach((line) => {
        const [key, value] = line.split("=")
        if (key && value) {
            process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, "")
        }
    })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
})

async function cleanupStrandedUsers() {
    console.log("Starting cleanup of stranded users...")

    try {
        // 1. Fetch all profiles
        const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id")

        if (profilesError) throw profilesError

        const profileIds = new Set(profiles.map(p => p.id))
        console.log(`Found ${profileIds.size} profiles.`)

        // 2. Fetch all auth users
        // Note: listUsers defaults to 50 users per page. We'll fetch up to 1000 for now.
        const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({
            perPage: 1000
        })

        if (usersError) throw usersError

        console.log(`Found ${users.length} auth users.`)

        // 3. Identify stranded users
        const strandedUsers = users.filter(user => !profileIds.has(user.id))

        console.log(`Found ${strandedUsers.length} stranded users (no matching profile).`)

        // 4. Delete stranded users
        for (const user of strandedUsers) {
            console.log(`Deleting stranded user: ${user.email} (${user.id})`)
            const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

            if (deleteError) {
                console.error(`Failed to delete user ${user.id}:`, deleteError)
            } else {
                console.log(`Successfully deleted user ${user.id}`)
            }
        }

        console.log("Cleanup complete.")

    } catch (error) {
        console.error("Error during cleanup:", error)
    }
}

cleanupStrandedUsers()
