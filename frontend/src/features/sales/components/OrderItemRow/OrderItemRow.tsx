import { formatPrice } from '../../../../shared/utils/formatPrice'
import type { CartItem } from '../../types/cart.types'
import QuantityStepper from '../QuantityStepper/QuantityStepper'
import styles from './OrderItemRow.module.css'

type Props = {
  item: CartItem
  onIncrease: () => void
  onDecrease: () => void
  onRemove: () => void
}

export default function OrderItemRow({ item, onIncrease, onDecrease, onRemove }: Props) {
  const label = `${item.productName}, ${item.variantName}`
  // Subtotal solo para mostrar: el precio real lo calcula el backend al confirmar.
  const subtotalCents = item.unitPriceCents * item.quantity

  return (
    <li className={styles.row}>
      <div className={styles.info}>
        <strong>{item.productName}</strong>
        <span className={styles.variant}>{item.variantName}</span>
        <span className={styles.unitPrice}>$ {formatPrice(item.unitPriceCents)} c/u</span>
      </div>
      <div className={styles.stepper}>
        <QuantityStepper
          quantity={item.quantity}
          itemLabel={label}
          onIncrease={onIncrease}
          onDecrease={onDecrease}
        />
      </div>
      <span className={styles.subtotal}>$ {formatPrice(subtotalCents)}</span>
      <button type="button" className={styles.remove} onClick={onRemove} aria-label={`Quitar ${label} del pedido`}>
        Quitar
      </button>
    </li>
  )
}
