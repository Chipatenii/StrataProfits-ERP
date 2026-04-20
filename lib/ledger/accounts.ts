import type { SupabaseClient } from "@supabase/supabase-js"

// System account codes seeded in migration 042. Using codes (stable) instead of UUIDs.
export const ACCOUNT_CODES = {
    CASH_ON_HAND: "1000",
    BANK_MAIN: "1010",
    MOBILE_MONEY_MTN: "1020",
    MOBILE_MONEY_AIRTEL: "1030",
    MOBILE_MONEY_ZAMTEL: "1040",
    ACCOUNTS_RECEIVABLE: "1100",
    ACCOUNTS_PAYABLE: "2000",
    VAT_PAYABLE: "2100",
    SERVICE_REVENUE: "4000",
    FX_LOSSES: "6810",
    // Expense category mapping
    EXP_TRANSPORT: "6400",
    EXP_DATA_INTERNET: "6300",
    EXP_OFFICE_SPACE: "6100",
    EXP_MEALS: "6500",
    EXP_OTHER: "6900",
} as const

export type PaymentMethod = "cash" | "bank_transfer" | "mobile_money" | "card" | "other" | null

export type ExpenseCategory = "Transport" | "Data" | "OfficeSpace" | "Meal" | "Other"

export function paymentMethodToAccountCode(
    method: PaymentMethod,
    mobileMoneyProvider?: string | null
): string {
    switch (method) {
        case "cash": return ACCOUNT_CODES.CASH_ON_HAND
        case "bank_transfer":
        case "card":
            return ACCOUNT_CODES.BANK_MAIN
        case "mobile_money":
            switch ((mobileMoneyProvider || "").toLowerCase()) {
                case "mtn": return ACCOUNT_CODES.MOBILE_MONEY_MTN
                case "airtel": return ACCOUNT_CODES.MOBILE_MONEY_AIRTEL
                case "zamtel": return ACCOUNT_CODES.MOBILE_MONEY_ZAMTEL
                default: return ACCOUNT_CODES.MOBILE_MONEY_MTN
            }
        default:
            return ACCOUNT_CODES.CASH_ON_HAND
    }
}

export function expenseCategoryToAccountCode(category: ExpenseCategory | string | null | undefined): string {
    switch (category) {
        case "Transport": return ACCOUNT_CODES.EXP_TRANSPORT
        case "Data": return ACCOUNT_CODES.EXP_DATA_INTERNET
        case "OfficeSpace": return ACCOUNT_CODES.EXP_OFFICE_SPACE
        case "Meal": return ACCOUNT_CODES.EXP_MEALS
        default: return ACCOUNT_CODES.EXP_OTHER
    }
}

const cache = new Map<string, string>()

export async function resolveAccountId(
    supabase: SupabaseClient,
    code: string
): Promise<string> {
    if (cache.has(code)) return cache.get(code) as string

    const { data, error } = await supabase
        .from("accounts")
        .select("id")
        .eq("code", code)
        .eq("is_active", true)
        .single()

    if (error || !data) {
        throw new Error(`Account with code ${code} not found. Did you run migration 042?`)
    }

    cache.set(code, data.id)
    return data.id
}

export function clearAccountCache() {
    cache.clear()
}
