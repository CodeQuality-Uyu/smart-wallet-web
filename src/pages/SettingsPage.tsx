import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthContext'
import styles from './SettingsPage.module.css'

interface SettingItem {
  icon: string
  label: string
  description: string
  path: string
}

const SECTIONS: SettingItem[] = [
  { icon: '📋', label: 'Reportes', description: 'Cierres mensuales e historial de gastos', path: '/settings/reports' },
  { icon: '🔄', label: 'Pagos recurrentes', description: 'Suscripciones y servicios mensuales', path: '/settings/recurring' },
  { icon: '📍', label: 'Locales', description: 'Lugares donde realizás gastos', path: '/settings/places' },
  { icon: '🛒', label: 'Productos', description: 'Catálogo de productos del mercado', path: '/settings/products' },
  { icon: '🏷️', label: 'Categorías de productos', description: 'Tipos de producto para el catálogo', path: '/settings/product-categories' },
  { icon: '🏷️', label: 'Categorías', description: 'Organizá tus gastos por tipo', path: '/settings/categories' },
  { icon: '💳', label: 'Medios de pago', description: 'Tarjetas y formas de pago', path: '/settings/cards' },
  { icon: '💰', label: 'Sueldos', description: 'Registrá tus ingresos mensuales', path: '/settings/salaries' },
  { icon: '🎯', label: 'Presupuesto', description: 'Límite de gasto mensual por moneda', path: '/settings/budget' },
]

export default function SettingsPage(): React.ReactElement {
  const navigate = useNavigate()
  const { logout } = useAuth()

  function handleLogout(): void {
    logout()
    void navigate('/login', { replace: true })
  }

  return (
    <div>
      <div className={styles.body}>
        {SECTIONS.map((item) => (
          <button
            key={item.path}
            className={styles.item}
            onClick={() => void navigate(item.path)}
          >
            <div className={styles.itemIcon}>{item.icon}</div>
            <div className={styles.itemInfo}>
              <span className={styles.itemLabel}>{item.label}</span>
              <span className={styles.itemDesc}>{item.description}</span>
            </div>
            <span className={styles.chevron}>›</span>
          </button>
        ))}

        <button className={[styles.item, styles.itemLogout].join(' ')} onClick={handleLogout}>
          <div className={styles.itemIcon}>🚪</div>
          <div className={styles.itemInfo}>
            <span className={styles.itemLabel}>Cerrar sesión</span>
            <span className={styles.itemDesc}>Salir de tu cuenta</span>
          </div>
        </button>
      </div>
    </div>
  )
}
