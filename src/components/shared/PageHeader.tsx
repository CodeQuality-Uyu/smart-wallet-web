// src/components/shared/PageHeader.tsx

import React from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './PageHeader.module.css'

interface PageHeaderProps {
  title: string
  subtitle?: string
  showBack?: boolean
  rightAction?: React.ReactNode
}

export function PageHeader({
  title,
  subtitle,
  showBack = false,
  rightAction,
}: PageHeaderProps): React.ReactElement {
  const navigate = useNavigate()

  return (
    <header className={styles.header}>
      <div className={styles.top}>
        {showBack && (
          <button
            className={styles.backBtn}
            onClick={() => navigate(-1)}
            aria-label="Volver"
          >
            ←
          </button>
        )}
        <h1 className={styles.title}>{title}</h1>
        {rightAction && <div className={styles.right}>{rightAction}</div>}
      </div>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </header>
  )
}
