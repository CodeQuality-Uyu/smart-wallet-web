// src/pages/SecurityPage/SecurityPage.tsx
import React, { useState } from 'react'
import styles from './SecurityPage.module.css'

type TwoFactorMethod = 'email' | 'app'

interface Session {
  device: string
  browser: string
  ip: string
  date: string
  type: 'desktop' | 'mobile' | 'tablet'
  current?: boolean
}

interface ActivityEntry {
  action: string
  device: string
  datetime: string
  ip: string
}

const MOCK_SESSIONS: Session[] = [
  { device: 'MacBook Pro', browser: 'Safari', ip: 'Montevideo, UY', date: 'Hace 2 min', type: 'desktop', current: true },
  { device: 'iPhone 15', browser: 'Chrome', ip: 'Buenos Aires, AR', date: 'Hace 1 hora', type: 'mobile' },
  { device: 'iPad Air', browser: 'Safari', ip: 'Maldonado, UY', date: 'Hace 3 días', type: 'tablet' },
]


const MOCK_ACTIVITY: ActivityEntry[] = [
  { action: 'Inicio de sesión', device: 'MacBook Pro', datetime: '06 Abr 2026, 10:23', ip: '192.168.1.45' },
  { action: 'Cambio de contraseña', device: 'MacBook Pro', datetime: '05 Abr 2026, 18:10', ip: '192.168.1.45' },
  { action: 'Exportación de datos', device: 'iPhone 15', datetime: '04 Abr 2026, 09:45', ip: '192.168.1.102' },
  { action: 'Inicio de sesión', device: 'iPad Air', datetime: '03 Abr 2026, 14:30', ip: '10.0.0.23' },
]

const ACTIVITY_ICONS: Record<string, string> = {
  'Inicio de sesión': '🔑',
  'Cambio de contraseña': '🔒',
  'Exportación de datos': '📥',
}

interface PrivacyToggle {
  id: string
  icon: string
  label: string
  desc: string
  defaultOn: boolean
}

const PRIVACY_TOGGLES: PrivacyToggle[] = [
  { id: 'biometric', icon: '👤', label: 'Bloqueo por Face ID', desc: 'Requerí biometría para abrir la app', defaultOn: true },
  { id: 'history', icon: '📋', label: 'Historial de actividad', desc: 'Guardá un registro de acciones en tu cuenta', defaultOn: true },
  { id: 'sync', icon: '🔄', label: 'Sincronización', desc: 'Sincronizá datos entre dispositivos en tiempo real', defaultOn: false },
  { id: 'privacy', icon: '🛡️', label: 'Privacidad de datos', desc: 'Restringí el uso de tus datos para mejoras del servicio', defaultOn: false },
]

export default function SecurityPage(): React.ReactElement {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<TwoFactorMethod>('email')
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(PRIVACY_TOGGLES.map((t) => [t.id, t.defaultOn]))
  )

  function handleToggle(id: string): void {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const securityScore = 85

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Seguridad</h1>
        <p className={styles.subtitle}>Protegé tu cuenta y controlá tu información financiera</p>
      </header>

      {/* Security level + 2FA */}
      <div className={styles.topGrid}>
        {/* Security level card */}
        <div className={styles.levelCard}>
          <div className={styles.ringWrapper}>
            <svg className={styles.ring} viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#f0ebe0" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke="var(--g500)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(securityScore / 100) * 264} 264`}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className={styles.ringLabel}>
              <span className={styles.ringScore}>{securityScore}%</span>
            </div>
          </div>
          <div className={styles.levelInfo}>
            <p className={styles.levelTitle}>Nivel de seguridad</p>
            <span className={styles.levelBadge}>Alto</span>
            <p className={styles.levelDesc}>
              Activá la autenticación en dos pasos para llegar al 100%
            </p>
          </div>
        </div>

        {/* Unified 2FA card */}
        <div className={styles.twoFactorCard}>
          <div className={styles.twoFactorHeader}>
            <div className={styles.twoFactorIconWrap}>
              <span>🛡️</span>
            </div>
            <div className={styles.twoFactorMeta}>
              <span className={styles.twoFactorTitle}>Autenticación de 2 pasos</span>
              <span className={`${styles.badge} ${twoFactorEnabled ? styles.badgeActive : styles.badgeInactive}`}>
                {twoFactorEnabled ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
          <p className={styles.twoFactorDesc}>
            Añadí una capa extra de seguridad. Elegí cómo recibir tu código de verificación.
          </p>

          {/* Radio options */}
          <div className={styles.methodOptions}>
            <label className={`${styles.methodOption} ${selectedMethod === 'email' ? styles.methodOptionSelected : ''}`}>
              <input
                type="radio"
                name="2fa-method"
                value="email"
                checked={selectedMethod === 'email'}
                onChange={() => setSelectedMethod('email')}
                className={styles.radioInput}
              />
              <span className={styles.radioCustom} />
              <span className={styles.methodIcon}>✉️</span>
              <div className={styles.methodInfo}>
                <span className={styles.methodName}>Código por email</span>
                <span className={styles.methodSub}>d***@gmail.com</span>
              </div>
            </label>
            <label className={`${styles.methodOption} ${selectedMethod === 'app' ? styles.methodOptionSelected : ''}`}>
              <input
                type="radio"
                name="2fa-method"
                value="app"
                checked={selectedMethod === 'app'}
                onChange={() => setSelectedMethod('app')}
                className={styles.radioInput}
              />
              <span className={styles.radioCustom} />
              <span className={styles.methodIcon}>📱</span>
              <div className={styles.methodInfo}>
                <span className={styles.methodName}>App autenticadora</span>
                <span className={styles.methodSub}>Google Authenticator / similar</span>
              </div>
            </label>
          </div>

          <button
            className={twoFactorEnabled ? styles.outlineBtnFull : styles.greenBtnFull}
            type="button"
            onClick={() => setTwoFactorEnabled((v) => !v)}
          >
            {twoFactorEnabled ? 'Desactivar 2FA' : 'Activar 2FA'}
          </button>
        </div>
      </div>

      {/* Sessions + Privacy */}
      <div className={styles.midGrid}>
        {/* Sessions */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <div className={styles.cardTitleGroup}>
              <div className={styles.cardTitleIconWrap}>
                <span>🖥️</span>
              </div>
              <div>
                <h2 className={styles.sectionTitle}>Sesiones activas</h2>
                <p className={styles.sectionDesc}>Dispositivos con acceso activo a tu cuenta</p>
              </div>
            </div>
          </div>
          <div className={styles.sessionList}>
            {MOCK_SESSIONS.map((s) => (
              <div key={s.device} className={styles.sessionItem}>
                <div className={styles.sessionInfo}>
                  <span className={styles.sessionDevice}>
                    {s.device}
                    <span className={styles.sessionBrowser}> · {s.browser}</span>
                  </span>
                  <span className={styles.sessionMeta}>{s.ip} · {s.date}</span>
                </div>
                {s.current
                  ? <span className={styles.activeBadge}>Activo</span>
                  : <button className={styles.closeSessionBtn} type="button">Cerrar</button>
                }
              </div>
            ))}
          </div>
          <button className={styles.closeAllBtn} type="button">Cerrar todas las sesiones</button>
        </section>

        {/* Privacy toggles */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <div className={styles.cardTitleGroup}>
              <div className={styles.cardTitleIconWrap}>
                <span>🔒</span>
              </div>
              <div>
                <h2 className={styles.sectionTitle}>Privacidad y datos</h2>
                <p className={styles.sectionDesc}>Controlá cómo se usa tu información</p>
              </div>
            </div>
          </div>
          <div className={styles.toggleList}>
            {PRIVACY_TOGGLES.map((t) => (
              <div key={t.id} className={styles.toggleRow}>
                <div className={styles.toggleTextGroup}>
                  <span className={styles.toggleLabel}>{t.label}</span>
                  <span className={styles.toggleDesc}>{t.desc}</span>
                </div>
                <button
                  type="button"
                  className={`${styles.toggle} ${toggles[t.id] ? styles.toggleOn : ''}`}
                  onClick={() => handleToggle(t.id)}
                  aria-pressed={toggles[t.id]}
                >
                  <span className={styles.toggleKnob} />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Activity log */}
      <section className={styles.activityCard}>
        <div className={styles.cardHeaderRow}>
          <h2 className={styles.sectionTitle}>Registro de actividad reciente</h2>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Acción</th>
                <th>Dispositivo</th>
                <th>Fecha / hora</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ACTIVITY.map((entry, i) => (
                <tr key={i}>
                  <td>
                    <span className={styles.activityCell}>
                      <span className={styles.activityIconWrap}>
                        {ACTIVITY_ICONS[entry.action] ?? '📌'}
                      </span>
                      {entry.action}
                    </span>
                  </td>
                  <td>{entry.device}</td>
                  <td className={styles.mono}>{entry.datetime}</td>
                  <td className={styles.mono}>{entry.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Danger zone */}
      <section className={styles.dangerCard}>
        <div className={styles.dangerHeader}>
          <span className={styles.dangerIcon}>⚠️</span>
          <div>
            <h2 className={styles.dangerTitle}>Zona peligrosa</h2>
            <p className={styles.dangerDesc}>Estas acciones son irreversibles. Procedé con cuidado.</p>
          </div>
        </div>
        <div className={styles.dangerActions}>
          <div className={styles.dangerRow}>
            <div>
              <p className={styles.dangerRowTitle}>Eliminar cuenta</p>
              <p className={styles.dangerRowDesc}>Se borrarán todos tus datos permanentemente. No hay vuelta atrás.</p>
            </div>
            <button className={styles.dangerBtn} type="button">Eliminar cuenta</button>
          </div>
        </div>
      </section>
    </div>
  )
}
