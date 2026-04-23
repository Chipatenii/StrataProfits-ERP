/**
 * Shared formatting utilities
 */

/**
 * Format a number as currency (2 decimal places, locale-aware)
 * Example: formatCurrency(1234.5) => "1,234.50"
 */
export function formatCurrency(n: number): string {
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Format a number in Zambian Kwacha with "ZMW" prefix.
 * Example: formatZMW(1234.5) => "ZMW 1,234.50"
 */
export function formatZMW(n: number): string {
    return `ZMW ${formatCurrency(Number(n || 0))}`
}

/**
 * Format a number with the "K" (Kwacha shorthand) prefix used in KPI cards.
 * Example: formatKwacha(1234.5) => "K1,234.50"
 */
export function formatKwacha(n: number): string {
    return `K${formatCurrency(n)}`
}
