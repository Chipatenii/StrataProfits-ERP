import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { generateDocumentNumber } from "@/lib/utils/document-numbers"

const createQuoteSchema = z.object({
    client_id: z.string().uuid(),
    deal_id: z.string().uuid().optional().nullable(),
    project_id: z.string().uuid().optional().nullable(),
    quote_number: z.string().optional(),
    reference_number: z.string().optional(),
    currency: z.string().default('ZMW'),
    valid_until: z.string().optional(),
    terms: z.string().optional(),
    notes: z.string().optional(),
    customer_notes: z.string().optional(),
    discount_rate: z.number().min(0).default(0),
    discount_amount: z.number().min(0).default(0),
    adjustment: z.number().default(0),
    amount: z.number().optional(),
    status: z.string().default('draft'),
    items: z.array(z.object({
        description: z.string(),
        quantity: z.number().min(0),
        unit_price: z.number().min(0),
        tax_rate: z.number().min(0).default(0),
        tax_amount: z.number().min(0).default(0)
    })).min(1)
})

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const clientId = searchParams.get('client_id')

        let query = supabase.from("quotes").select("*, client:clients(name), items:quote_items(*)")

        if (status) query = query.eq('status', status)
        if (clientId) query = query.eq('client_id', clientId)

        const { data, error } = await query

        if (error) throw error
        return NextResponse.json(data)
    } catch (error) {
        console.error("Error fetching quotes:", error)
        return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        // Check Role (Admin/VA/Bookkeeper)
        const admin = await createAdminClient()
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
        if (!['admin', 'virtual_assistant', 'book_keeper'].includes(profile?.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await request.json()
        const validation = createQuoteSchema.safeParse(body)

        if (!validation.success) {
            console.error("Quote validation failed:", validation.error.format())
            return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 })
        }

        const { items, ...quoteData } = validation.data

        // Auto-generate quote number if not supplied
        if (!quoteData.quote_number) {
            quoteData.quote_number = await generateDocumentNumber(admin, 'quotes', 'QUO')
        }

        // Server-side: compute and persist the canonical quote total so it is
        // always consistent with line items regardless of what the client sends.
        if (items && items.length > 0) {
            const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
            const taxTotal = items.reduce((sum, item) => sum + (item.tax_amount || 0), 0)
            const discount = quoteData.discount_amount || 0
            const adjust = quoteData.adjustment || 0
            quoteData.amount = subtotal - discount + taxTotal + adjust
            if (quoteData.amount < 0) {
                return NextResponse.json(
                    { error: "Validation failed", details: "Calculated quote total cannot be negative" },
                    { status: 400 }
                )
            }
        }

        // 1. Create Quote
        const { data: quote, error } = await admin
            .from("quotes")
            .insert({
                ...quoteData,
                created_by: user.id
            })
            .select()
            .single()

        if (error) throw error

        // 2. Create Items — include computed `total` per line
        if (items && items.length > 0) {
            const itemsWithId = items.map(item => ({
                quote_id: quote.id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.quantity * item.unit_price,
                tax_rate: item.tax_rate,
                tax_amount: item.tax_amount,
            }))

            const { error: itemsError } = await admin.from("quote_items").insert(itemsWithId)
            if (itemsError) {
                // Compensating rollback: remove the orphaned quote header
                await admin.from("quotes").delete().eq("id", quote.id)
                console.error("Failed to insert items for quote " + quote.id + " — quote rolled back", itemsError)
                throw itemsError
            }
        }

        return NextResponse.json(quote)
    } catch (error) {
        console.error("Error creating quote:", error)
        return NextResponse.json({ error: "Failed to create quote" }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        // Check Role (Admin/VA/Bookkeeper)
        const admin = await createAdminClient()
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
        if (!['admin', 'virtual_assistant', 'book_keeper'].includes(profile?.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await request.json()
        const { id, ...updateData } = body

        if (!id) {
            return NextResponse.json({ error: "Quote ID is required" }, { status: 400 })
        }

        // Verify quote exists before attempting an update to avoid silent no-op
        const { data: existingQuote, error: existsError } = await admin
            .from("quotes")
            .select("id")
            .eq("id", id)
            .single()

        if (existsError || !existingQuote) {
            return NextResponse.json({ error: "Quote not found" }, { status: 404 })
        }

        const validation = createQuoteSchema.partial().safeParse(updateData)

        if (!validation.success) {
            console.error("Quote validation failed:", validation.error.format())
            return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 })
        }

        const { items, ...quotePayload } = validation.data

        // Server-side: recompute total if items are being replaced
        if (items && items.length > 0) {
            const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
            const taxTotal = items.reduce((sum, item) => sum + (item.tax_amount || 0), 0)
            const discount = quotePayload.discount_amount || 0
            const adjust = quotePayload.adjustment || 0
            quotePayload.amount = subtotal - discount + taxTotal + adjust
            if (quotePayload.amount < 0) {
                return NextResponse.json(
                    { error: "Validation failed", details: "Calculated quote total cannot be negative" },
                    { status: 400 }
                )
            }
        }

        // 1. Update Quote
        const { data: quote, error } = await admin
            .from("quotes")
            .update(quotePayload)
            .eq("id", id)
            .select()
            .single()

        if (error) throw error

        // 2. Update Items (Safe Replace strategy)
        if (items !== undefined) {
            // Delete old items first so a failed insert leaves zero items (not doubled)
            const { error: deleteError } = await admin
                .from("quote_items")
                .delete()
                .eq("quote_id", id)
            if (deleteError) throw deleteError

            if (items.length > 0) {
                const itemsWithId = items.map(item => ({
                    quote_id: id,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total: item.quantity * item.unit_price,
                    tax_rate: item.tax_rate || 0,
                    tax_amount: item.tax_amount || 0,
                }))
                const { error: itemsError } = await admin.from("quote_items").insert(itemsWithId)
                if (itemsError) throw itemsError
            }
        }

        return NextResponse.json(quote)
    } catch (error) {
        console.error("Error updating quote:", error)
        return NextResponse.json({ error: "Failed to update quote" }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        const admin = await createAdminClient()
        const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: "Forbidden: Admin Only" }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 })

        await admin.from("quote_items").delete().eq("quote_id", id)

        const { error } = await admin.from("quotes").delete().eq("id", id)
        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Error deleting quote:", error)
        return NextResponse.json({ error: "Failed to delete quote" }, { status: 500 })
    }
}
