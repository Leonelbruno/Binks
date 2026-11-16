import type { CartItem } from '../types/cart.types'

export type OrderAction =
  | { type: 'add'; item: CartItem }
  | { type: 'increase'; variantId: number }
  | { type: 'decrease'; variantId: number }
  | { type: 'remove'; variantId: number }
  | { type: 'clear' }

export function orderReducer(state: CartItem[], action: OrderAction): CartItem[] {
  switch (action.type) {
    case 'add': {
      const existing = state.find((item) => item.variantId === action.item.variantId)
      if (!existing) {
        return [...state, action.item]
      }
      return state.map((item) => (
        item.variantId === action.item.variantId
          ? { ...item, quantity: item.quantity + action.item.quantity }
          : item
      ))
    }
    case 'increase':
      return state.map((item) => (
        item.variantId === action.variantId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    case 'decrease':
      return state.flatMap((item) => {
        if (item.variantId !== action.variantId) {
          return [item]
        }
        if (item.quantity <= 1) {
          return []
        }
        return [{ ...item, quantity: item.quantity - 1 }]
      })
    case 'remove':
      return state.filter((item) => item.variantId !== action.variantId)
    case 'clear':
      return []
    default:
      return state
  }
}
