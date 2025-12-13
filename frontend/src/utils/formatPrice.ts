export function formatPrice(price: number | undefined | null): string {
  if (price === undefined || price === null || isNaN(price)) {
    return '0.00'
  }
  return (Math.round(price * 100) / 100).toFixed(2)
}

export function formatPriceFromCents(priceInCents: number | undefined | null): string {
  if (priceInCents === undefined || priceInCents === null || isNaN(priceInCents)) {
    return '0.00'
  }
  return (priceInCents / 100).toFixed(2)
}
