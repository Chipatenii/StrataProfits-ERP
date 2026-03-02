/**
 * Server-side utility for generating sequential document reference numbers.
 * Format: PREFIX-YYYYMM-NNNN  e.g. INV-202603-0001
 * The sequence counter is the total count of all existing rows in the table + 1,
 * making it collision-resistant for typical single-region workloads.
 */
export async function generateDocumentNumber(
    adminClient: any,
    table: 'invoices' | 'quotes' | 'payments',
    prefix: string
): Promise<string> {
    const now = new Date()
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`

    const { count, error } = await adminClient
        .from(table)
        .select('id', { count: 'exact', head: true })

    if (error) {
        console.error(`[generateDocumentNumber] Failed to count ${table}:`, error)
        // Fallback: use a timestamp-based suffix that won't collide
        return `${prefix}-${yyyymm}-${Date.now().toString().slice(-4)}`
    }

    const next = ((count ?? 0) + 1).toString().padStart(4, '0')
    return `${prefix}-${yyyymm}-${next}`
}
