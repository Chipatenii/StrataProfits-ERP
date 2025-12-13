import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const createInvoiceSchema = z.object({
    client_id: z.string().uuid(),
    project_id: z.string().uuid().optional().nullable(),
    amount: z.number().min(0),
    currency: z.string().default('ZMW'),
    status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).default('draft'),
    due_date: z.string().optional(), // Date string
    invoice_number: z.string().optional(),
    order_number: z.string().optional(),
    terms: z.string().optional(),
    customer_notes: z.string().optional(),
    discount_rate: z.number().min(0).default(0),
    discount_amount: z.number().min(0).default(0),
    adjustment: z.number().default(0),
    is_tax_inclusive: z.boolean().default(false)
})

const updateInvoiceSchema = z.object({
    status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional(),
    invoice_number: z.string().optional()
})

async function checkPermission(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Unauthorized", status: 401 }

    const admin = await createAdminClient()
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== 'admin' && profile?.role !== 'virtual_assistant') {
        return { error: "Forbidden", status: 403 }
    }
    return { user }
}

export async function GET(request: NextRequest) {
    const perm = await checkPermission(request)
    if (perm.error) return NextResponse.json({ error: perm.error }, { status: perm.status })

    try {
        const admin = await createAdminClient()
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const clientId = searchParams.get('client_id')
        const status = searchParams.get('status')

        if (id) {
            // Fetch single invoice with details
            const { data: invoice, error } = await admin
                .from("invoices")
                .select(`
                    *,
                    client:clients(name, address, phone, tpin, email, contact_person),
                    project:projects(name),
                    items:invoice_items(*),
                    payments(*)
                `)
                .eq('id', id)
                .single()

            if (error) throw error
            return NextResponse.json(invoice)
        }

        let query = admin.from("invoices").select(`
            *,
            client:clients(name, address, phone, tpin, email, contact_person),
            project:projects(name)
        `).order("created_at", { ascending: false })

        if (clientId) query = query.eq('client_id', clientId)
        if (status) query = query.eq('status', status)

        const { data: invoices, error } = await query

        if (error) throw error
        return NextResponse.json(invoices)
    } catch (error) {
        console.error("Error fetching invoices:", error)
        return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const perm = await checkPermission(request)
    if (perm.error || !perm.user) return NextResponse.json({ error: perm.error || "Unauthorized" }, { status: perm.status || 401 })

    try {
        const body = await request.json()

        // Extended schema for Line Items validation
        const createInvoiceWithItems = createInvoiceSchema.extend({
            items: z.array(z.object({
                description: z.string(),
                quantity: z.number().min(0),
                unit_price: z.number().min(0),
                tax_rate: z.number().min(0).default(0),
                tax_amount: z.number().min(0).default(0)
            })).optional()
        })

        const validation = createInvoiceWithItems.safeParse(body)
        if (!validation.success) {
            return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 })
        }

        const { items, ...invoiceData } = validation.data
        const admin = await createAdminClient()

        // 1. Create Invoice
        // Calculate total amount from items if provided, otherwise trust the basic amount (legacy behavior)
        if (items && items.length > 0) {
            invoiceData.amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
        }

        const { data: invoice, error } = await admin
            .from("invoices")
            .insert({
                ...invoiceData,
                // created_by: perm.user.id // If column exists, otherwise reliance on RLS or audit logs
            })
            .select()
            .single()

        if (error) throw error

        // 2. Create Line Items
        if (items && items.length > 0 && invoice) {
            const itemsWithId = items.map(item => ({
                invoice_id: invoice.id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                tax_rate: item.tax_rate,
                tax_amount: item.tax_amount
            }))

            const { error: itemsError } = await admin
                .from("invoice_items")
                .insert(itemsWithId)

            if (itemsError) {
                // In a real postgres function this would roll back. 
                // Here we log the orphan issue. 
                console.error("Failed to insert items for invoice " + invoice.id, itemsError)
                throw itemsError
            }
        }

        return NextResponse.json(invoice)
    } catch (error) {
        console.error("Error creating invoice:", error)
        return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    const perm = await checkPermission(request)
    if (perm.error) return NextResponse.json({ error: perm.error }, { status: perm.status })

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

        const body = await request.json()
        const validation = updateInvoiceSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json({ error: "Validation failed" }, { status: 400 })
        }

        const admin = await createAdminClient()
        const { data: invoice, error } = await admin
            .from("invoices")
            .update(validation.data)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return NextResponse.json(invoice)
    } catch (error) {
        console.error("Error updating invoice:", error)
        return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 })
    }
}
