// src/components/shared/Breadcrumbs.tsx

import React from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Breadcrumbs.module.css'

export interface Crumb {
  label: string
  /** Ruta a navegar al hacer click. Ignorado en el último item (actual). */
  to?: string
  /** Handler alternativo (ej. navegación por estado interno). Tiene prioridad sobre `to`. */
  onClick?: () => void
}

interface BreadcrumbsProps {
  items: Crumb[]
  className?: string
}

/**
 * Migas de pan genéricas. El último item se muestra como página actual (no clickeable).
 * Cada crumb anterior es clickeable si tiene `to` u `onClick`.
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps): React.ReactElement {
  const navigate = useNavigate()

  return (
    <nav className={[styles.breadcrumbs, className].filter(Boolean).join(' ')} aria-label="Migas de pan">
      <ol className={styles.list}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const clickable = !isLast && (item.onClick || item.to)

          function handleClick(): void {
            if (item.onClick) item.onClick()
            else if (item.to) void navigate(item.to)
          }

          return (
            <li key={`${item.label}-${index}`} className={styles.item}>
              {clickable ? (
                <button className={styles.link} onClick={handleClick} type="button">
                  {item.label}
                </button>
              ) : (
                <span className={isLast ? styles.current : styles.plain} aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast && <span className={styles.separator} aria-hidden="true">›</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
