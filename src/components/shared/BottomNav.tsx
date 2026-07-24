// src/components/shared/BottomNav.tsx

import React from 'react'
import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

export function BottomNav(): React.ReactElement {
  return (
    <nav className={styles.nav}>
      <NavLink
        to="/home"
        className={({ isActive }) => [styles.tab, isActive ? styles.tabActive : ''].join(' ')}
      >
        <span className={styles.tabIcon}>🏠</span>
        <span className={styles.tabLabel}>Inicio</span>
      </NavLink>
    </nav>
  )
}
