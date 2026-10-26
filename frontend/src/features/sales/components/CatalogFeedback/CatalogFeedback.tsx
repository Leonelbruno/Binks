import type { ReactNode } from 'react'
import styles from './CatalogFeedback.module.css'

type Props = {
  children: ReactNode
  error?: boolean
  onRetry?: () => void
}

export default function CatalogFeedback({ children, error = false, onRetry }: Props) {
  return (
    <div className={styles.feedback} role={error ? 'alert' : 'status'}>
      <p>{children}</p>
      {onRetry && <button type="button" onClick={onRetry}>Reintentar</button>}
    </div>
  )
}
