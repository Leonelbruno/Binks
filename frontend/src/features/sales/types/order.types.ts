export type OrderItemRequest = {
  variantId: number
  quantity: number
}

export type CreateOrderRequest = {
  items: OrderItemRequest[]
}

export type OrderItemResponse = {
  variantId: number
  quantity: number
  productName?: string
  variantName?: string
  unitPriceCents?: number
}

export type OrderResponse = {
  id: number
  businessId: number
  orderNumber: number
  source: string
  status: string
  totalCents: number
  items: OrderItemResponse[]
  createdAt: string
  updatedAt: string
}
