import styles from './QuantityStepper.module.css'

type Props = {
  quantity: number
  // Texto que identifica el ítem, para los lectores de pantalla (ej: "Pollo a la parrilla, Entero").
  itemLabel: string
  onIncrease: () => void
  onDecrease: () => void
  disabled?: boolean
}

export default function QuantityStepper({ quantity, itemLabel, onIncrease, onDecrease, disabled = false }: Props) {
  // Con cantidad 1, restar elimina el ítem (lo decide quien maneja el estado del pedido).
  const removesItem = quantity <= 1

  return (
    <div className={styles.stepper} role="group" aria-label={`Cantidad de ${itemLabel}`}>
      <button
        type="button"
        className={styles.button}
        onClick={onDecrease}
        disabled={disabled}
        aria-label={removesItem ? `Quitar ${itemLabel} del pedido` : `Disminuir cantidad de ${itemLabel}`}
      >
        −
      </button>
      <span className={styles.value} aria-live="polite">{quantity}</span>
      <button
        type="button"
        className={styles.button}
        onClick={onIncrease}
        disabled={disabled}
        aria-label={`Aumentar cantidad de ${itemLabel}`}
      >
        +
      </button>
    </div>
  )
}
