// src/pages/ResetPasswordPage.tsx

import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { appConfig } from '@/app/config'
import styles from './ResetPasswordPage.module.css'

export default function ResetPasswordPage(): React.ReactElement {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const oobCode = searchParams.get('oobCode') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [loading, setLoading] = useState(false)
  const [globalError, setGlobalError] = useState('')

  // Only relevant for Firestore — MSW doesn't use this page
  const isFirestore = appConfig.backend === 'firestore'

  function validate(): { password?: string; confirm?: string } {
    const errs: { password?: string; confirm?: string } = {}
    if (!password) errs.password = 'La contraseña es requerida.'
    else if (password.length < 6) errs.password = 'Mínimo 6 caracteres.'
    if (!confirm) errs.confirm = 'Confirmá tu contraseña.'
    else if (confirm !== password) errs.confirm = 'Las contraseñas no coinciden.'
    return errs
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setGlobalError('')
    setLoading(true)
    try {
      const [{ confirmPasswordReset }, { firebaseAuth }] = await Promise.all([
        import('firebase/auth'),
        import('@/backend/firestore/config'),
      ])
      await confirmPasswordReset(firebaseAuth, oobCode, password)
      void navigate('/login?reset=true', { replace: true })
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : 'No se pudo restablecer la contraseña. El link puede haber expirado.'
      setGlobalError(message)
    } finally {
      setLoading(false)
    }
  }

  if (!isFirestore || !oobCode) {
    return (
      <div className={styles.page}>
        <div className={styles.hero}>
          <div className={styles.orb1} />
          <div className={styles.orb2} />
          <div className={styles.logo}>
            <div className={styles.logoMark}>🌿</div>
            <span className={styles.logoName}>verde</span>
          </div>
          <div className={styles.heroText}>
            <h1 className={styles.title}>Link<br /><em className={styles.em}>inválido</em></h1>
            <p className={styles.subtitle}>El link expiró o ya fue usado</p>
          </div>
        </div>
        <div className={styles.form}>
          <p className={styles.hint}>Pedí un nuevo link desde la pantalla de login.</p>
          <button className={styles.submitBtn} style={{ marginTop: 16 }} onClick={() => void navigate('/login')}>
            Ir al login →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.logo}>
          <div className={styles.logoMark}>🌿</div>
          <span className={styles.logoName}>verde</span>
        </div>
        <div className={styles.heroText}>
          <h1 className={styles.title}>Nueva<br /><em className={styles.em}>contraseña</em></h1>
          <p className={styles.subtitle}>Elegí una contraseña segura</p>
        </div>
      </div>

      <div className={styles.form}>
        <h2 className={styles.formTitle}>Restablecer contraseña</h2>

        {globalError && <p className={styles.error} style={{ marginBottom: 12 }}>{globalError}</p>}

        <form onSubmit={(e) => { void handleSubmit(e) }} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Nueva contraseña</label>
            <input
              id="password"
              type="password"
              className={[styles.input, errors.password ? styles.inputError : ''].join(' ')}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {errors.password && <p className={styles.error}>{errors.password}</p>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirm">Confirmar contraseña</label>
            <input
              id="confirm"
              type="password"
              className={[styles.input, errors.confirm ? styles.inputError : ''].join(' ')}
              placeholder="Repetí la contraseña"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {errors.confirm && <p className={styles.error}>{errors.confirm}</p>}
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Guardando…' : 'Guardar contraseña →'}
          </button>
        </form>

        <p className={styles.hint}>
          <button type="button" className={styles.link} onClick={() => void navigate('/login')}>
            ← Volver al login
          </button>
        </p>
      </div>
    </div>
  )
}
