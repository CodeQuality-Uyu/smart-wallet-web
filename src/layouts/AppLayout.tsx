// src/layouts/AppLayout.tsx

import React from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import styles from './AppLayout.module.css'

interface NavItem {
  to: string
  icon: string
  label: string
}

const NAV_ITEMS_LEFT: NavItem[] = [
  { to: '/home', icon: '🏠', label: 'Inicio' },
  { to: '/expenses', icon: '📋', label: 'Gastos' },
]

const NAV_ITEMS_RIGHT: NavItem[] = [
  { to: '/metrics', icon: '📊', label: 'Métricas' },
  { to: '/settings', icon: '⚙️', label: 'Configurar' },
]

export function AppLayout(): React.ReactElement {
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <Outlet />
      </main>

      {/* FAB — new expense */}
      <NavLink to="/expenses/new" className={styles.fab} aria-label="Registrar gasto">
        <span aria-hidden>＋</span>
      </NavLink>

      <nav className={styles.nav} aria-label="Navegación principal">
        {NAV_ITEMS_LEFT.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [styles.navItem, isActive ? styles.navItemActive : ''].join(' ')
            }
          >
            <span className={styles.navIcon} aria-hidden>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}

        {/* Empty slot for FAB */}
        <div className={styles.navSpacer} aria-hidden />

        {NAV_ITEMS_RIGHT.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [styles.navItem, isActive ? styles.navItemActive : ''].join(' ')
            }
          >
            <span className={styles.navIcon} aria-hidden>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
