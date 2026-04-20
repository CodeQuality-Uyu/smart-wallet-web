// src/layouts/SettingsLayout.tsx
import React, { useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthContext'
import styles from './SettingsLayout.module.css'

interface SectionItem {
  icon: string
  label: string
  path: string
}

const SECTIONS: SectionItem[] = [
  { icon: '👤', label: 'Perfil', path: '/settings/profile' },
  { icon: '📋', label: 'Reportes', path: '/settings/reports' },
  { icon: '🔄', label: 'Pagos recurrentes', path: '/settings/recurring' },
  { icon: '📍', label: 'Locales', path: '/settings/places' },
  { icon: '🛒', label: 'Productos', path: '/settings/products' },
  { icon: '🏷️', label: 'Categ. productos', path: '/settings/product-categories' },
  { icon: '🏷️', label: 'Categorías', path: '/settings/categories' },
  { icon: '💳', label: 'Medios de pago', path: '/settings/cards' },
  { icon: '🔔', label: 'Notificaciones', path: '/settings/notifications' },
  { icon: '📥', label: 'Exportar datos', path: '/settings/export' },
  { icon: '🎯', label: 'Metas de Ahorro', path: '/settings/savings-goals' },
  { icon: '🔒', label: 'Seguridad', path: '/settings/security' },
]

export function SettingsLayout(): React.ReactElement {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (location.pathname === '/settings') {
      void navigate('/settings/profile', { replace: true })
    }
  }, [location.pathname, navigate])

  function handleLogout(): void {
    logout()
    void navigate('/login', { replace: true })
  }

  return (
    <div className={styles.desktopView}>
      <aside className={styles.sidebar}>
        <nav className={styles.nav}>
          {SECTIONS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                [styles.navItem, isActive ? styles.navItemActive : ''].join(' ')
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <span>🚪</span>
          <span>Cerrar sesión</span>
        </button>
      </aside>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
