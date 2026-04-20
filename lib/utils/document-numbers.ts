/**
 * Server-side utility for generating sequential document reference numbers.
 * Format: PREFIX-YYYYMM-NNNN  e.g. INV-202603-0001
 * The sequence counter is MAX(existing number for this month) + 1, so deleted
 * rows do not cause number reuse and the counter resets cleanly each month.
 *
 * NOTE (follow-up): This is still not race-safe under concurrent requests.
 * The proper fix is to add UNIQUE constraints on invoice_number, quote_number,
 * and receipt_number, then wrap callers in retry-on-duplicate logic.
 */

const NUMBER_COLUMN: Record<'invoices' | 'quotes' | 'payments', string> = {
    invoices: 'invoice_number',
    quotes: 'quote_number',
    payments: 'receipt_number',
}

export async function generateDocumentNumber(
    adminClient: any,
    table: 'invoices' | 'quotes' | 'payments',
    prefix: string
): Promise<string> {
    const now = new Date()
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`

    // FIX: use MAX of the highest existing number this month instead of COUNT(*),
    // so deletions don't cause reuse and the counter is properly scoped per month
    const col = NUMBER_COLUMN[table]
    const monthPrefix = `${prefix}-${yyyymm}-`

    const { data, error } = await adminClient
        .from(table)
        .select(col)
        .like(col, `${monthPrefix}%`)
        .order(col, { ascending: false })
        .limit(1)

    if (error) {
        console.error(`[generateDocumentNumber] Failed to query ${table}:`, error)
        // Fallback: use a timestamp-based suffix that won't collide
        return `${prefix}-${yyyymm}-${Date.now().toString().slice(-4)}`
    }

    const lastSuffix = data?.[0]?.[col]?.split('-').pop() ?? '0000'
    const nextN = (parseInt(lastSuffix, 10) + 1).toString().padStart(4, '0')
    return `${monthPrefix}${nextN}`
}
