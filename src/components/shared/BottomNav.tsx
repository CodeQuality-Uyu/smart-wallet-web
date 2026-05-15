// src/components/shared/BottomNav.tsx

import React from 'react'
import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

export function BottomNav(): React.ReactElement {
  return (
    <nav className={styles.nav}>
      <NavLink
        to="/expenses/new"
        className={({ isActive }) => [styles.tab, isActive ? styles.tabActive : ''].join(' ')}
      >
        <span className={styles.tabIcon}>＋</span>
        <span className={styles.tabLabel}>Nuevo gasto</span>
      </NavLink>

      <NavLink
        to="/expenses"
        className={({ isActive }) => [styles.tab, isActive ? styles.tabActive : ''].join(' ')}
      >
        <span className={styles.tabIcon}>📋</span>
        <span className={styles.tabLabel}>Gastos</span>
      </NavLink>
    </nav>
  )
}
