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
