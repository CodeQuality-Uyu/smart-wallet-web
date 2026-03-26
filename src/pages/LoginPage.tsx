import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import styles from './LoginPage.module.css'
import { useAuth } from '@/app/providers/AuthContext'

type Mode = 'login' | 'register' | 'forgot'

interface FieldErrors {
  name?: string
  lastName?: string
  email?: string
  password?: string
}

export default function LoginPage(): React.ReactElement {
  const { login, register, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const justVerified = searchParams.get('verified') === 'true'
  const justReset = searchParams.get('reset') === 'true'

  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState(
    justVerified ? '¡Email verificado! Ya podés ingresar.' :
    justReset ? '¡Contraseña restablecida! Ya podés ingresar.' : ''
  )

  function validate(): FieldErrors {
    const errs: FieldErrors = {}
    if (mode === 'register') {
      if (!name.trim()) errs.name = 'El nombre es requerido.'
      if (!lastName.trim()) errs.lastName = 'El apellido es requerido.'
    }
    if (!email.trim()) {
      errs.email = 'El email es requerido.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Ingresá un email válido.'
    }
    if (mode !== 'forgot') {
      if (!password) errs.password = 'La contraseña es requerida.'
      else if (mode === 'register' && password.length < 6) errs.password = 'Mínimo 6 caracteres.'
    }
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
    setSuccessMsg('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email.trim(), password)
        void navigate('/home')
      } else if (mode === 'register') {
        await register(`${name.trim()} ${lastName.trim()}`, email.trim(), password)
        void navigate('/verify-code', { state: { email: email.trim() } })
      } else {
        await resetPassword(email.trim())
        setSuccessMsg('Te enviamos un email para restablecer tu contraseña.')
        setMode('login')
      }
    } catch (err) {
      const message = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : 'Algo salió mal. Intentá de nuevo.'
      setErrors({ email: message })
    } finally {
      setLoading(false)
    }
  }

  function switchMode(next: Mode): void {
    setMode(next)
    setErrors({})
    setSuccessMsg('')
    setName('')
    setLastName('')
    setEmail('')
    setPassword('')
  }

  const isLogin = mode === 'login'
  const isRegister = mode === 'register'
  const isForgot = mode === 'forgot'

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.dollar} aria-hidden>$</div>
        <div className={styles.logo}>
          <div className={styles.logoMark}>🌿</div>
          <span className={styles.logoName}>SmartWallet</span>
        </div>
        <div className={styles.heroText}>
          <h1 className={styles.title}>
            {isLogin
              ? <>Bienvenido<br />de <em className={styles.em}>vuelta</em></>
              : isRegister
                ? <>Registrate<br />es <em className={styles.em}>gratis</em></>
                : <>Recuperá<br />tu <em className={styles.em}>cuenta</em></>}
          </h1>
          <p className={styles.subtitle}>
            {isLogin ? 'Tu dinero te está esperando' : isRegister ? 'Creá tu cuenta y empezá a trackear' : 'Te mandamos un link para crear una nueva contraseña'}
          </p>
        </div>
      </div>

      <div className={styles.form}>
        <h2 className={styles.formTitle}>
          {isLogin ? 'Ingresá' : isRegister ? 'Creá tu cuenta' : 'Recuperar contraseña'}
        </h2>

        {successMsg && <p className={styles.success}>{successMsg}</p>}

        <form onSubmit={(e) => { void handleSubmit(e) }} noValidate>
          {isRegister && (
            <>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="name">Nombre</label>
                <input
                  id="name"
                  type="text"
                  className={[styles.input, errors.name ? styles.inputError : ''].join(' ')}
                  placeholder="Tu nombre"
                  autoComplete="given-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && <p className={styles.error}>{errors.name}</p>}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="lastName">Apellido</label>
                <input
                  id="lastName"
                  type="text"
                  className={[styles.input, errors.lastName ? styles.inputError : ''].join(' ')}
                  placeholder="Tu apellido"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
                {errors.lastName && <p className={styles.error}>{errors.lastName}</p>}
              </div>
            </>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className={[styles.input, errors.email ? styles.inputError : ''].join(' ')}
              placeholder="hola@ejemplo.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <p className={styles.error}>{errors.email}</p>}
          </div>

          {!isForgot && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                className={[styles.input, errors.password ? styles.inputError : ''].join(' ')}
                placeholder={isRegister ? 'Mínimo 6 caracteres' : '••••••••'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {errors.password && <p className={styles.error}>{errors.password}</p>}
            </div>
          )}

          {isLogin && (
            <p className={styles.hint} style={{ marginBottom: 4, textAlign: 'right' }}>
              <button type="button" className={styles.link} onClick={() => switchMode('forgot')}>
                ¿Olvidaste tu contraseña?
              </button>
            </p>
          )}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading
              ? 'Cargando…'
              : isLogin
                ? 'Ingresar →'
                : isRegister
                  ? 'Crear cuenta →'
                  : 'Enviar link →'}
          </button>
        </form>

        <p className={styles.hint}>
          {isLogin ? (
            <>¿No tenés cuenta?{' '}
              <button type="button" className={styles.link} onClick={() => switchMode('register')}>
                Registrate
              </button>
            </>
          ) : (
            <>
              <button type="button" className={styles.link} onClick={() => switchMode('login')}>
                ← Volver al inicio
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
