import type { SupabaseClient } from "@supabase/supabase-js"
import {
    ACCOUNT_CODES,
    expenseCategoryToAccountCode,
    paymentMethodToAccountCode,
    resolveAccountId,
} from "./accounts"

const BASE_CURRENCY = "ZMW"

type JournalLineInput = {
    account_id: string
    debit?: number
    credit?: number
    currency?: string
    fx_rate?: number
    memo?: string | null
    client_id?: string | null
    project_id?: string | null
}

type PostJournalInput = {
    entry_date: string
    memo: string
    source_type: "invoice" | "payment" | "expense" | "payroll" | "manual" | "fx_revaluation" | "opening_balance"
    source_id?: string | null
    posted_by?: string | null
    lines: JournalLineInput[]
}

/**
 * Post a balanced journal entry in a single transaction.
 * Inserts the header as draft, inserts the lines, then flips to posted
 * (triggering the balance check).
 */
export async function postJournalEntry(
    supabase: SupabaseClient,
    input: PostJournalInput
): Promise<{ id: string; entry_number: string | null }> {
    const { data: entry, error: headerError } = await supabase
        .from("journal_entries")
        .insert({
            entry_date: input.entry_date,
            memo: input.memo,
            source_type: input.source_type,
            source_id: input.source_id ?? null,
            created_by: input.posted_by ?? null,
            status: "draft",
        })
        .select("id, entry_number")
        .single()

    if (headerError || !entry) {
        throw new Error(`Failed to create journal entry: ${headerError?.message}`)
    }

    const lineRows = input.lines.map((line, idx) => ({
        entry_id: entry.id,
        line_number: idx + 1,
        account_id: line.account_id,
        debit: line.debit ?? 0,
        credit: line.credit ?? 0,
        currency: line.currency ?? BASE_CURRENCY,
        fx_rate: line.fx_rate ?? 1,
        memo: line.memo ?? null,
        client_id: line.client_id ?? null,
        project_id: line.project_id ?? null,
    }))

    const { error: linesError } = await supabase.from("journal_lines").insert(lineRows)

    if (linesError) {
        await supabase.from("journal_entries").delete().eq("id", entry.id)
        throw new Error(`Failed to create journal lines: ${linesError.message}`)
    }

    const { error: postError } = await supabase
        .from("journal_entries")
        .update({
            status: "posted",
            posted_by: input.posted_by ?? null,
        })
        .eq("id", entry.id)

    if (postError) {
        await supabase.from("journal_entries").delete().eq("id", entry.id)
        throw new Error(`Failed to post journal entry (unbalanced?): ${postError.message}`)
    }

    return entry
}

type PaymentRecord = {
    id: string
    invoice_id: string
    amount: number
    currency: string
    exchange_rate?: number | null
    method: string | null
    reference?: string | null
    receipt_number?: string | null
    paid_at: string
    cash_account_id?: string | null
    journal_entry_id?: string | null
    received_by_user_id?: string | null
}

type InvoiceContext = {
    invoice_number?: string | null
    client_id?: string | null
    project_id?: string | null
}

/**
 * Cash-basis: when payment is received, recognize revenue.
 *   Dr Cash/Bank (debit in txn currency) / Cr Service Revenue
 *
 * Idempotent: if payment.journal_entry_id is already set, skips.
 */
export async function postPayment(
    supabase: SupabaseClient,
    payment: PaymentRecord,
    invoiceContext: InvoiceContext = {},
    opts: { mobileMoneyProvider?: string | null } = {}
): Promise<string | null> {
    if (payment.journal_entry_id) return payment.journal_entry_id

    const fxRate = payment.exchange_rate ?? 1
    const currency = payment.currency || BASE_CURRENCY

    const cashAccountId = payment.cash_account_id
        ?? await resolveAccountId(
            supabase,
            paymentMethodToAccountCode(payment.method as any, opts.mobileMoneyProvider)
        )

    const revenueAccountId = await resolveAccountId(supabase, ACCOUNT_CODES.SERVICE_REVENUE)

    const memo = [
        `Payment received`,
        invoiceContext.invoice_number ? `inv ${invoiceContext.invoice_number}` : null,
        payment.receipt_number ? `rcpt ${payment.receipt_number}` : null,
        payment.reference ? `ref ${payment.reference}` : null,
    ].filter(Boolean).join(" — ")

    const entry = await postJournalEntry(supabase, {
        entry_date: payment.paid_at.slice(0, 10),
        memo,
        source_type: "payment",
        source_id: payment.id,
        posted_by: payment.received_by_user_id,
        lines: [
            {
                account_id: cashAccountId,
                debit: payment.amount,
                currency,
                fx_rate: fxRate,
                memo: "Cash / bank in",
                client_id: invoiceContext.client_id ?? null,
                project_id: invoiceContext.project_id ?? null,
            },
            {
                account_id: revenueAccountId,
                credit: payment.amount,
                currency,
                fx_rate: fxRate,
                memo: "Revenue recognized (cash basis)",
                client_id: invoiceContext.client_id ?? null,
                project_id: invoiceContext.project_id ?? null,
            },
        ],
    })

    await supabase.from("payments").update({ journal_entry_id: entry.id }).eq("id", payment.id)
    return entry.id
}

type ExpenseRecord = {
    id: string
    category: string | null
    amount: number
    currency: string
    exchange_rate?: number | null
    description?: string | null
    expense_account_id?: string | null
    paid_from_account_id?: string | null
    paid_at?: string | null
    journal_entry_id?: string | null
    submitted_by_user_id?: string | null
    client_id?: string | null
    project_id?: string | null
}

/**
 * Cash-basis: when expense is paid, recognize it.
 *   Dr Expense Account / Cr Cash (or paid_from_account)
 *
 * Idempotent: skips if journal_entry_id already set.
 * No-op if paid_at is null (expense recognized only on payment).
 */
export async function postExpense(
    supabase: SupabaseClient,
    expense: ExpenseRecord
): Promise<string | null> {
    if (expense.journal_entry_id) return expense.journal_entry_id
    if (!expense.paid_at) return null

    const fxRate = expense.exchange_rate ?? 1
    const currency = expense.currency || BASE_CURRENCY

    const expenseAccountId = expense.expense_account_id
        ?? await resolveAccountId(supabase, expenseCategoryToAccountCode(expense.category as any))

    const paidFromAccountId = expense.paid_from_account_id
        ?? await resolveAccountId(supabase, ACCOUNT_CODES.CASH_ON_HAND)

    const memo = [
        `Expense`,
        expense.category ? `(${expense.category})` : null,
        expense.description ? `— ${expense.description}` : null,
    ].filter(Boolean).join(" ")

    const entry = await postJournalEntry(supabase, {
        entry_date: expense.paid_at.slice(0, 10),
        memo,
        source_type: "expense",
        source_id: expense.id,
        posted_by: expense.submitted_by_user_id,
        lines: [
            {
                account_id: expenseAccountId,
                debit: expense.amount,
                currency,
                fx_rate: fxRate,
                memo: "Expense recognized",
                client_id: expense.client_id ?? null,
                project_id: expense.project_id ?? null,
            },
            {
                account_id: paidFromAccountId,
                credit: expense.amount,
                currency,
                fx_rate: fxRate,
                memo: "Paid from",
                client_id: expense.client_id ?? null,
                project_id: expense.project_id ?? null,
            },
        ],
    })

    await supabase.from("expenses").update({ journal_entry_id: entry.id }).eq("id", expense.id)
    return entry.id
}

/**
 * Create a reversing journal entry for a previously-posted entry.
 * Original stays 'posted' (history is immutable); new entry has flipped
 * debits/credits; original.reversed_by_entry_id points to the new one.
 */
export async function reverseEntry(
    supabase: SupabaseClient,
    originalEntryId: string,
    reason: string,
    userId?: string | null
): Promise<string> {
    const { data: original, error: fetchError } = await supabase
        .from("journal_entries")
        .select("*, lines:journal_lines(*)")
        .eq("id", originalEntryId)
        .single()

    if (fetchError || !original) {
        throw new Error(`Original entry ${originalEntryId} not found`)
    }
    if (original.status !== "posted") {
        throw new Error(`Cannot reverse a ${original.status} entry`)
    }

    const today = new Date().toISOString().slice(0, 10)

    const flippedLines: JournalLineInput[] = (original.lines || []).map((line: any) => ({
        account_id: line.account_id,
        debit: Number(line.credit) || 0,
        credit: Number(line.debit) || 0,
        currency: line.currency,
        fx_rate: Number(line.fx_rate) || 1,
        memo: `Reversal: ${line.memo ?? ""}`.trim(),
        client_id: line.client_id,
        project_id: line.project_id,
    }))

    const reversingEntry = await postJournalEntry(supabase, {
        entry_date: today,
        memo: `Reversal of ${original.entry_number ?? original.id} — ${reason}`,
        source_type: original.source_type,
        source_id: original.source_id,
        posted_by: userId,
        lines: flippedLines,
    })

    await supabase
        .from("journal_entries")
        .update({
            status: "reversed",
            reversed_by_entry_id: reversingEntry.id,
        })
        .eq("id", originalEntryId)

    return reversingEntry.id
}
