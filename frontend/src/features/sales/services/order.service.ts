import { api } from '../../../shared/services/api'
import type { CreateOrderRequest, OrderItemRequest, OrderResponse } from '../types/order.types'

export function createOrder(
  businessId: number,
  items: OrderItemRequest[] | CreateOrderRequest,
): Promise<OrderResponse> {
  const payload: CreateOrderRequest = Array.isArray(items)
    ? { items: items.map(({ variantId, quantity }) => ({ variantId, quantity })) }
    : items

  return api.post<OrderResponse>(`/api/businesses/${businessId}/orders`, payload)
}
