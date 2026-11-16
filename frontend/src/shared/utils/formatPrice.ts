const priceFormatter = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// Recibe el precio en centavos y devuelve el número con formato es-AR (ej: 12.000,00).
// El símbolo "$" lo agrega quien lo muestra, igual que en el catálogo.
export function formatPrice(priceCents: number): string {
  return priceFormatter.format(priceCents / 100)
}
