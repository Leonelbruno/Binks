// Ítem del pedido actual (carrito) de Caja.
// unitPriceCents se usa solo para mostrar el subtotal en la UI; el backend
// revalida el precio real al confirmar el pedido.
export type CartItem = {
  variantId: number
  quantity: number
  productName: string
  variantName: string
  unitPriceCents: number
}
