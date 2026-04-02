// src/layouts/AppLayout.tsx

import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthContext'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import styles from './AppLayout.module.css'

interface NavItem {
  to: string
  icon: string
  label: string
}

const NAV_ITEMS_LEFT: NavItem[] = [
  { to: '/home',    icon: '🏠', label: 'Inicio' },
  { to: '/expenses', icon: '📋', label: 'Gastos' },
]

const NAV_ITEMS_RIGHT: NavItem[] = [
  { to: '/metrics',  icon: '📊', label: 'Métricas' },
  { to: '/settings', icon: '⚙️', label: 'Configurar' },
]

const ALL_NAV = [...NAV_ITEMS_LEFT, ...NAV_ITEMS_RIGHT]

function DesktopLayout(): React.ReactElement {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout(): void {
    logout()
    void navigate('/login', { replace: true })
  }

  const initials = user?.name?.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() ?? '?'

  return (
    <div className={styles.desktopShell}>
      <header className={styles.desktopNav}>
        <div className={styles.desktopNavInner}>
          {/* Logo */}
          <div className={styles.desktopLogo}>
            <div className={styles.desktopLogoMark}>$</div>
            <span className={styles.desktopLogoName}>Smart Wallet</span>
          </div>

          {/* Nav links */}
          <nav className={styles.desktopNavLinks}>
            {ALL_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [styles.desktopNavLink, isActive ? styles.desktopNavLinkActive : ''].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* User */}
          <div className={styles.desktopUser}>
            {user && (
              <span className={styles.desktopUserGreeting}>
                <span className={styles.desktopUserGreetingLabel}>Hola,</span>
                <strong>{user.name}</strong>
              </span>
            )}
            <button className={styles.desktopAvatar} onClick={handleLogout} title="Cerrar sesión">
              {initials}
            </button>
          </div>
        </div>
      </header>

      <main className={styles.desktopMain}>
        <div className={styles.desktopContent}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function MobileLayout(): React.ReactElement {
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <Outlet />
      </main>

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

export function AppLayout(): React.ReactElement {
  const isDesktop = useIsDesktop()
  return isDesktop ? <DesktopLayout /> : <MobileLayout />
}
