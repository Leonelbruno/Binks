import { formatPrice } from '../../../../shared/utils/formatPrice'
import type { CartItem } from '../../types/cart.types'
import OrderItemRow from '../OrderItemRow/OrderItemRow'
import styles from './CurrentOrderPanel.module.css'

type Props = {
  items: CartItem[]
  onIncrease: (variantId: number) => void
  onDecrease: (variantId: number) => void
  onRemove: (variantId: number) => void
  onClear: () => void
  onConfirm: () => void
  // Mientras se envía el pedido, se bloquean las acciones.
  isConfirming?: boolean
}

export default function CurrentOrderPanel({
  items,
  onIncrease,
  onDecrease,
  onRemove,
  onClear,
  onConfirm,
  isConfirming = false,
}: Props) {
  const isEmpty = items.length === 0
  // Total solo para mostrar: el precio real lo calcula el backend al confirmar.
  const totalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0)

  return (
    <section className={styles.panel} aria-labelledby="current-order-title">
      <h2 id="current-order-title" className={styles.title}>Pedido actual</h2>

      {isEmpty ? (
        <p className={styles.empty}>Todavía no agregaste productos al pedido.</p>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => (
            <OrderItemRow
              key={item.variantId}
              item={item}
              onIncrease={() => onIncrease(item.variantId)}
              onDecrease={() => onDecrease(item.variantId)}
              onRemove={() => onRemove(item.variantId)}
            />
          ))}
        </ul>
      )}

      <div className={styles.total}>
        <span>Total estimado</span>
        <strong>$ {formatPrice(totalCents)}</strong>
      </div>
      <p className={styles.note}>El precio final lo confirma el sistema al registrar el pedido.</p>

      <div className={styles.actions}>
        <button type="button" className={styles.clear} onClick={onClear} disabled={isEmpty || isConfirming}>
          Vaciar pedido
        </button>
        <button type="button" className={styles.confirm} onClick={onConfirm} disabled={isEmpty || isConfirming}>
          {isConfirming ? 'Confirmando…' : 'Confirmar pedido'}
        </button>
      </div>
    </section>
  )
}
