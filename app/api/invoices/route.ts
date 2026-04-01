import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { generateDocumentNumber } from "@/lib/utils/document-numbers"

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

const updateInvoiceSchema = createInvoiceSchema.partial()

async function checkPermission(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: "Unauthorized", status: 401 }

        const admin = await createAdminClient()
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()

        if (profile?.role !== 'admin' && profile?.role !== 'virtual_assistant') {
            return { error: "Forbidden", status: 403 }
        }
        return { user }
    } catch (error) {
        console.error("Auth permission check failed:", error)
        return { error: "Internal Server Error", status: 500 }
    }
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
                    client:clients(name, location, phone, email),
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
            client:clients(name, location, phone, email),
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

        // Auto-generate invoice number if not supplied
        if (!invoiceData.invoice_number) {
            invoiceData.invoice_number = await generateDocumentNumber(admin, 'invoices', 'INV')
        }

        // 1. Create Invoice
        // Calculate total amount correctly on server side to ensure data integrity
        if (items && items.length > 0) {
            const itemSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
            const itemTaxTotal = items.reduce((sum, item) => sum + (item.tax_amount || 0), 0)

            // Use provided discount/adjustment or defaults
            const discount = invoiceData.discount_amount || 0
            const adjust = invoiceData.adjustment || 0

            // Final Amount = Subtotal - Discount + Tax + Adjustment
            invoiceData.amount = itemSubtotal - discount + itemTaxTotal + adjust

            if (invoiceData.amount < 0) {
                return NextResponse.json({ error: "Validation failed", details: "Calculated final amount cannot be negative" }, { status: 400 })
            }
        }

        const { data: invoice, error } = await admin
            .from("invoices")
            .insert({
                ...invoiceData,
                created_by_user_id: perm.user.id,
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
                // Compensating rollback: delete the orphaned invoice header so we don't leave partial data
                await admin.from("invoices").delete().eq("id", invoice.id)
                console.error("Failed to insert items for invoice " + invoice.id + " — invoice rolled back", itemsError)
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

        // Extended schema for Line Items validation
        const updateInvoiceWithItems = updateInvoiceSchema.extend({
            items: z.array(z.object({
                description: z.string(),
                quantity: z.number().min(0),
                unit_price: z.number().min(0),
                tax_rate: z.number().min(0).default(0),
                tax_amount: z.number().min(0).default(0)
            })).optional()
        })

        const validation = updateInvoiceWithItems.safeParse(body)
        if (!validation.success) {
            return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 })
        }

        const { items, ...invoiceData } = validation.data
        const admin = await createAdminClient()

        // 1. Recalculate if items provided
        if (items && items.length > 0) {
            const itemSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
            const itemTaxTotal = items.reduce((sum, item) => sum + (item.tax_amount || 0), 0)
            const discount = invoiceData.discount_amount || 0
            const adjust = invoiceData.adjustment || 0
            invoiceData.amount = itemSubtotal - discount + itemTaxTotal + adjust

            if (invoiceData.amount < 0) {
                return NextResponse.json({ error: "Validation failed", details: "Calculated final amount cannot be negative" }, { status: 400 })
            }
        }

        // 2. Update Invoice
        const { data: invoice, error } = await admin
            .from("invoices")
            .update(invoiceData)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        // 3. Update Items (Safe Replace strategy)
        if (items && items.length > 0) {
            // Grab old items to delete later
            const { data: old } = await admin.from("invoice_items").select("id").eq("invoice_id", id)
            const oldIds = old?.map(i => i.id) || []

            // Insert new
            const itemsWithId = items.map(item => ({
                invoice_id: id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                tax_rate: item.tax_rate,
                tax_amount: item.tax_amount
            }))

            const { error: itemsError } = await admin
                .from("invoice_items")
                .insert(itemsWithId)

            if (itemsError) throw itemsError

            // Cleanly delete old items only after successful insertion
            if (oldIds.length > 0) {
                await admin.from("invoice_items").delete().in('id', oldIds)
            }
        }

        return NextResponse.json(invoice)
    } catch (error) {
        console.error("Error updating invoice:", error)
        return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    const perm = await checkPermission(request)
    if (perm.error) return NextResponse.json({ error: perm.error }, { status: perm.status })

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

        const admin = await createAdminClient()

        // Delete items first (though FK should handle it, explicit is safer)
        await admin.from("invoice_items").delete().eq('invoice_id', id)

        const { error } = await admin
            .from("invoices")
            .delete()
            .eq('id', id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting invoice:", error)
        return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 })
    }
}
