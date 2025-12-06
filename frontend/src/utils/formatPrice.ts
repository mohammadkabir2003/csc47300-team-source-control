/**
 * Format a price value to display with 2 decimal places
 * Handles floating point precision issues
 * @param price - Price in dollars (not cents)
 * @returns Formatted price string like "14.99"
 */
export function formatPrice(price: number | undefined | null): string {
  if (price === undefined || price === null || isNaN(price)) {
    return '0.00'
  }
  // Round to 2 decimal places to fix floating point errors
  return (Math.round(price * 100) / 100).toFixed(2)
}

/**
 * Format a price in cents to display with 2 decimal places
 * @param priceInCents - Price in cents
 * @returns Formatted price string like "14.99"
 */
export function formatPriceFromCents(priceInCents: number | undefined | null): string {
  if (priceInCents === undefined || priceInCents === null || isNaN(priceInCents)) {
    return '0.00'
  }
  return (priceInCents / 100).toFixed(2)
}
