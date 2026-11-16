import { formatPrice } from '../../../../shared/utils/formatPrice'
import type { CartItem } from '../../types/cart.types'
import QuantityStepper from '../QuantityStepper/QuantityStepper'
import styles from './OrderItemRow.module.css'

type Props = {
  item: CartItem
  onIncrease: () => void
  onDecrease: () => void
  onRemove: () => void
  disabled?: boolean
}

export default function OrderItemRow({ item, onIncrease, onDecrease, onRemove, disabled = false }: Props) {
  const label = `${item.productName}, ${item.variantName}`
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
          disabled={disabled}
        />
      </div>
      <span className={styles.subtotal}>$ {formatPrice(subtotalCents)}</span>
      <button type="button" className={styles.remove} onClick={onRemove} aria-label={`Quitar ${label} del pedido`} disabled={disabled}>
        Quitar
      </button>
    </li>
  )
}
