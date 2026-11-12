// Ítem del pedido actual (carrito) de Caja.
// unitPriceCents es solo para mostrar en pantalla: al confirmar el pedido se envían
// únicamente variantId y quantity, y el backend vuelve a consultar el precio real.
export type CartItem = {
  variantId: number
  quantity: number
  productName: string
  variantName: string
  unitPriceCents: number
}
