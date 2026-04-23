import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { generateDocumentNumber } from "@/lib/utils/document-numbers"

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const admin = await createAdminClient()
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()

        if (profile?.role !== 'admin' && profile?.role !== 'virtual_assistant') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { deliverable_id } = await request.json()

        if (!deliverable_id) {
            return NextResponse.json({ error: "Deliverable ID required" }, { status: 400 })
        }

        // 1. Fetch deliverable details
        const { data: deliverable, error: devError } = await admin
            .from("deliverables")
            .select(`
                *,
                project:projects(client_id, name)
            `)
            .eq("id", deliverable_id)
            .single()

        if (devError || !deliverable) {
            return NextResponse.json({ error: "Deliverable not found" }, { status: 404 })
        }

        if (deliverable.invoice_id) {
            return NextResponse.json({ error: "Deliverable already billed" }, { status: 400 })
        }

        if (deliverable.approval_status !== "approved") {
            return NextResponse.json({ error: "Deliverable must be approved before billing" }, { status: 400 })
        }

        const project = deliverable.project as any
        if (!project?.client_id) {
            return NextResponse.json({ error: "Project has no associated client" }, { status: 400 })
        }

        // 2. Generate a sequential invoice number (same format as all other invoices)
        const invoiceNumber = await generateDocumentNumber(admin, 'invoices', 'INV')

        // 3. Create Invoice
        const { data: invoice, error: invError } = await admin
            .from("invoices")
            .insert({
                client_id: project.client_id,
                project_id: deliverable.project_id,
                amount: deliverable.total_price,
                currency: "ZMW",
                status: "draft",
                invoice_number: invoiceNumber,
                created_by_user_id: user.id,
                due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
                customer_notes: `Billing for deliverable: ${deliverable.name}`,
            })
            .select()
            .single()

        if (invError) {
            console.error("Error creating invoice:", invError)
            throw invError
        }

        // 4. Create Invoice Item (with computed total)
        const { error: itemError } = await admin
            .from("invoice_items")
            .insert({
                invoice_id: invoice.id,
                description: `Deliverable: ${deliverable.name}`,
                quantity: 1,
                unit_price: deliverable.total_price,
                total: deliverable.total_price,
            })

        if (itemError) {
            console.error("Error creating invoice item:", itemError)
            // Compensating rollback: remove the orphaned invoice header
            await admin.from("invoices").delete().eq("id", invoice.id)
            throw itemError
        }

        // 5. Link Invoice back to Deliverable
        const { error: syncError } = await admin
            .from("deliverables")
            .update({ invoice_id: invoice.id })
            .eq("id", deliverable.id)

        if (syncError) throw syncError

        return NextResponse.json({
            success: true,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
        })

    } catch (error) {
        console.error("Error in deliverable billing:", error)
        return NextResponse.json({ error: "Failed to bill deliverable" }, { status: 500 })
    }
}
