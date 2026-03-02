export const APP_CONFIG = {
    name: "StrataForge Business Suite",
    shortName: "StrataForge",
    tagline: "ERP for Service Businesses",
    currency: "ZMW",
    version: "2.0.0",
    features: {
        ff_deliverables_enabled: true, // Stage 1 & 2 Flag
    }
} as const

export const APP_NAME = APP_CONFIG.name
