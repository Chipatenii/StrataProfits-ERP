export const APP_CONFIG = {
    name: "StrataForge Business Suite",
    shortName: "StrataForge",
    tagline: "ERP for Service Businesses",
    currency: "ZMW",
    version: "2.0.0",
    features: {
        ff_deliverables_enabled: true, // Stage 1 & 2 Flag
    },
    PAGINATION: {
        NOTIFICATIONS_LIMIT: 50,
        DEFAULT_SINGLE_RECORD: 1,
    },
    REPORTS: {
        FINANCE_SUMMARY_LIMIT: 5,
        FINANCE_HISTORY_LIMIT: 6,
        MONTHS_LIMIT: 12,
    },
    FINANCE: {
        DEFAULT_TAX_RATE: Number(process.env.NEXT_PUBLIC_DEFAULT_TAX_RATE) || 0,
        DEFAULT_DISCOUNT_RATE: Number(process.env.NEXT_PUBLIC_DEFAULT_DISCOUNT_RATE) || 0,
    },
} as const

export const APP_NAME = APP_CONFIG.name
