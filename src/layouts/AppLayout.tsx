// src/layouts/AppLayout.tsx

import React from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthContext'
import styles from './AppLayout.module.css'

interface NavItem {
  to: string
  icon: string
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/home',     icon: '🏠', label: 'Inicio' },
  { to: '/expenses', icon: '📋', label: 'Gastos' },
  { to: '/metrics',  icon: '📊', label: 'Métricas' },
  { to: '/settings', icon: '⚙️', label: 'Configurar' },
]

const MOBILE_BREAKPOINT = 768

export function AppLayout(): React.ReactElement {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isSettings = pathname.startsWith('/settings')

  React.useEffect(() => {
    if (window.innerWidth < MOBILE_BREAKPOINT && pathname !== '/expenses/new') {
      void navigate('/expenses/new', { replace: true })
    }
  }, [pathname, navigate])

  function handleLogout(): void {
    logout()
    void navigate('/login', { replace: true })
  }

  const initials = user?.name?.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() ?? '?'

  return (
    <div className={styles.shell}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          {/* Logo */}
          <div className={styles.logo}>
            <div className={styles.logoMark}>$</div>
            <span className={styles.logoName}>Smart Wallet</span>
          </div>

          {/* Nav links */}
          <nav className={styles.navLinks}>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [styles.navLink, isActive ? styles.navLinkActive : ''].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* User */}
          <div className={styles.user}>
            {user && (
              <span className={styles.userGreeting}>
                <span className={styles.userGreetingLabel}>Hola,</span>
                <strong>{user.name}</strong>
              </span>
            )}
            <button className={styles.avatar} onClick={handleLogout} title="Cerrar sesión">
              {initials}
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.content} style={isSettings ? { padding: 0 } : undefined}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
