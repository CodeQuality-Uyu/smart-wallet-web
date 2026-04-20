import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import styles from './LoginPage.module.css'
import { useAuth } from '@/app/providers/AuthContext'
import { markOnboardingPending, markOnboardingSocial } from '@/app/router'

const IS_FIRESTORE = import.meta.env.VITE_BACKEND === 'firestore'
const MAGIC_LINK_EMAIL_KEY = 'magic_link_email'

type Mode = 'login' | 'register' | 'forgot'

const loginSchema = Yup.object({
  email: Yup.string().email('Ingresá un email válido.').required('El email es requerido.'),
  password: Yup.string().required('La contraseña es requerida.'),
})

const registerSchema = Yup.object({
  name: Yup.string().trim().required('El nombre es requerido.'),
  lastName: Yup.string().trim().required('El apellido es requerido.'),
  email: Yup.string().email('Ingresá un email válido.').required('El email es requerido.'),
  password: Yup.string().min(6, 'Mínimo 6 caracteres.').required('La contraseña es requerida.'),
})

const forgotSchema = Yup.object({
  email: Yup.string().email('Ingresá un email válido.').required('El email es requerido.'),
})

const INITIAL_VALUES = { name: '', lastName: '', email: '', password: '' }

export default function LoginPage(): React.ReactElement {
  const { login, register, resetPassword, loginWithGoogle, sendMagicLink, confirmMagicLink } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const justVerified = searchParams.get('verified') === 'true'
  const justReset = searchParams.get('reset') === 'true'

  const [mode, setMode] = useState<Mode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [successMsg, setSuccessMsg] = useState(
    justVerified ? '¡Email verificado! Ya podés ingresar.' :
    justReset ? '¡Contraseña restablecida! Ya podés ingresar.' : ''
  )
  const [socialError, setSocialError] = useState('')
  const [socialLoading, setSocialLoading] = useState(false)

  // Magic Link state
  const [magicEmail, setMagicEmail] = useState('')
  const [magicEmailOpen, setMagicEmailOpen] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const [magicError, setMagicError] = useState('')
  const magicInputRef = useRef<HTMLInputElement>(null)

  const isLogin = mode === 'login'
  const isRegister = mode === 'register'
  const isForgot = mode === 'forgot'

  const schema = isLogin ? loginSchema : isRegister ? registerSchema : forgotSchema

  function switchMode(next: Mode): void {
    setMode(next)
    setSuccessMsg('')
    setSocialError('')
    setMagicEmailOpen(false)
    setMagicSent(false)
    setMagicEmail('')
    setMagicError('')
  }

  function handleSocialSuccess(isNewUser: boolean): void {
    if (isNewUser) {
      markOnboardingSocial()
      void navigate('/onboarding')
    } else {
      void navigate('/home')
    }
  }

  async function handleGoogle(): Promise<void> {
    setSocialLoading(true)
    setSocialError('')
    try {
      const { isNewUser } = await loginWithGoogle()
      handleSocialSuccess(isNewUser)
    } catch (err) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : 'Error al iniciar sesión con Google.'
      setSocialError(msg)
    } finally {
      setSocialLoading(false)
    }
  }

  function handleMagicLinkOpen(): void {
    setMagicEmailOpen(true)
    setMagicSent(false)
    setMagicError('')
    setTimeout(() => magicInputRef.current?.focus(), 50)
  }

  async function handleMagicLinkSend(): Promise<void> {
    const email = magicEmail.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMagicError('Ingresá un email válido.')
      return
    }
    setSocialLoading(true)
    setMagicError('')
    try {
      await sendMagicLink(email)
      setMagicSent(true)
    } catch (err) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : 'Error al enviar el link.'
      setMagicError(msg)
    } finally {
      setSocialLoading(false)
    }
  }

  async function handleMagicLinkConfirm(email: string): Promise<void> {
    setSocialLoading(true)
    setSocialError('')
    try {
      const { isNewUser } = await confirmMagicLink(email)
      handleSocialSuccess(isNewUser)
    } catch (err) {
      const msg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : 'El link no es válido o ya expiró.'
      setSocialError(msg)
    } finally {
      setSocialLoading(false)
    }
  }

  // Firestore: auto-detect magic link on page load
  useEffect(() => {
    if (!IS_FIRESTORE) return
    // Check if this URL is a Firebase email sign-in link
    void import('firebase/auth').then(async ({ isSignInWithEmailLink }) => {
      const { firebaseAuth } = await import('@/backend/firestore/config')
      if (!isSignInWithEmailLink(firebaseAuth, window.location.href)) return
      const storedEmail = window.localStorage.getItem(MAGIC_LINK_EMAIL_KEY)
      if (storedEmail) {
        await handleMagicLinkConfirm(storedEmail)
      } else {
        // Ask user for their email (unlikely but possible if different device)
        setMagicEmailOpen(true)
        setSocialError('Ingresá el email con el que pediste el link para completar el acceso.')
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.dollar} aria-hidden>$</div>
        <div className={styles.logo}>
          <div className={styles.logoMark}>$</div>
          <span className={styles.logoName}>Verde</span>
        </div>
        <div className={styles.heroText}>
          <div className={styles.heroEmoji} aria-hidden>💰</div>
          <h1 className={styles.title}>
            {isLogin
              ? <>Tu plata,<br /><em className={styles.em}>bajo control.</em></>
              : isRegister
                ? <>Empezá a<br />ahorrar <em className={styles.em}>hoy.</em></>
                : <>Recuperá<br />tu <em className={styles.em}>cuenta</em></>}
          </h1>
          <p className={styles.subtitle}>
            {isLogin
              ? 'Ahorrá más. Gastá mejor. Sin vueltas.'
              : isRegister
                ? 'Creá tu cuenta en 30 segundos y tomá el control de tus finanzas.'
                : 'Te mandamos un link para crear una nueva contraseña'}
          </p>
        </div>

        <ul className={styles.features}>
          <li className={styles.feature}>
            <span className={styles.featureIcon}>📊</span>
            <span>Visualizá tus gastos en tiempo real</span>
          </li>
          <li className={styles.feature}>
            <span className={styles.featureIcon}>💳</span>
            <span>Gestioná múltiples tarjetas y cuentas</span>
          </li>
          <li className={styles.feature}>
            <span className={styles.featureIcon}>🎯</span>
            <span>Alcanzá tus metas de ahorro</span>
          </li>
        </ul>

        <div className={styles.statBadges}>
          {isRegister ? (
            <>
              <div className={styles.statBadge}>
                <span className={styles.statIcon}>🔒</span>
                <div>
                  <span className={styles.statNumber}>Datos seguros</span>
                  <span className={styles.statLabel}>Encriptación end-to-end</span>
                </div>
              </div>
              <div className={styles.statBadge}>
                <span className={styles.statIcon}>💪</span>
                <div>
                  <span className={styles.statNumber}>Setup rápido</span>
                  <span className={styles.statLabel}>2 minutos y listo</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.statBadge}>
                <span className={styles.statIcon}>👤</span>
                <div>
                  <span className={styles.statNumber}>+2.4k</span>
                  <span className={styles.statLabel}>Usuarios trackeando</span>
                </div>
              </div>
              <div className={styles.statBadge}>
                <span className={styles.statIcon}>👨‍👩‍👧‍👦</span>
                <div>
                  <span className={styles.statNumber}>156</span>
                  <span className={styles.statLabel}>Familias activas</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.form}>
        <p className={styles.formTag}>Autenticación</p>
        <h2 className={styles.formTitle}>
          {isLogin ? 'Iniciar sesión' : isRegister ? 'Creá tu cuenta' : 'Recuperar contraseña'}
        </h2>
        <p className={styles.formSubtitle}>
          {isLogin
            ? 'Ingresá tus datos para acceder a tu cuenta'
            : isRegister
              ? 'Completá tus datos para empezar'
              : 'Ingresá tu email para recibir un link'}
        </p>

        {successMsg && <p className={styles.success}>{successMsg}</p>}

        {/* Magic link form — shown instead of credentials form */}
        {isLogin && magicEmailOpen && !magicSent && (
          <div className={styles.magicBox}>
            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input
                ref={magicInputRef}
                type="email"
                className={styles.input}
                placeholder="tu@email.com"
                value={magicEmail}
                onChange={e => setMagicEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void handleMagicLinkSend() } }}
                autoComplete="email"
              />
            </div>
            {magicError && <p className={styles.error}>{magicError}</p>}
            <button
              type="button"
              className={styles.submitBtn}
              onClick={() => void handleMagicLinkSend()}
              disabled={socialLoading}
            >
              {socialLoading ? 'Enviando…' : 'Enviar link →'}
            </button>
          </div>
        )}

        {isLogin && magicSent && (
          <div className={styles.magicBox}>
            <p className={styles.success} style={{ marginBottom: 0 }}>
              {IS_FIRESTORE
                ? `Te enviamos un link a ${magicEmail}. Hacé clic en él para ingresar.`
                : `Link enviado a ${magicEmail}.`}
            </p>
            {!IS_FIRESTORE && (
              <button
                type="button"
                className={styles.submitBtn}
                style={{ marginTop: 10 }}
                onClick={() => void handleMagicLinkConfirm(magicEmail)}
                disabled={socialLoading}
              >
                {socialLoading ? 'Verificando…' : 'Simular link →'}
              </button>
            )}
          </div>
        )}

        {!(isLogin && magicEmailOpen) && <Formik
          key={mode}
          initialValues={INITIAL_VALUES}
          validationSchema={schema}
          onSubmit={async (values, { setFieldError }) => {
            setSuccessMsg('')
            try {
              if (isLogin) {
                await login(values.email.trim(), values.password)
                void navigate('/home')
              } else if (isRegister) {
                await register(
                  `${values.name.trim()} ${values.lastName.trim()}`,
                  values.email.trim(),
                  values.password,
                )
                markOnboardingPending()
                void navigate('/verify-code', { state: { email: values.email.trim() } })
              } else {
                await resetPassword(values.email.trim())
                setSuccessMsg('Te enviamos un email para restablecer tu contraseña.')
                switchMode('login')
              }
            } catch (err) {
              const message = err && typeof err === 'object' && 'message' in err
                ? String((err as { message: string }).message)
                : 'Algo salió mal. Intentá de nuevo.'
              setFieldError('email', message)
            }
          }}
        >
          {({ isSubmitting, errors, touched }) => (
            <Form noValidate>
              {isRegister && (
                <div className={styles.nameRow}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="name">Nombre</label>
                    <Field
                      id="name"
                      name="name"
                      type="text"
                      className={[styles.input, errors.name && touched.name ? styles.inputError : ''].join(' ')}
                      placeholder="Tu nombre"
                      autoComplete="given-name"
                    />
                    <ErrorMessage name="name" component="p" className={styles.error} />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="lastName">Apellido</label>
                    <Field
                      id="lastName"
                      name="lastName"
                      type="text"
                      className={[styles.input, errors.lastName && touched.lastName ? styles.inputError : ''].join(' ')}
                      placeholder="Tu apellido"
                      autoComplete="family-name"
                    />
                    <ErrorMessage name="lastName" component="p" className={styles.error} />
                  </div>
                </div>
              )}

              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">Email</label>
                <Field
                  id="email"
                  name="email"
                  type="email"
                  className={[styles.input, errors.email && touched.email ? styles.inputError : ''].join(' ')}
                  placeholder="hola@ejemplo.com"
                  autoComplete="email"
                />
                <ErrorMessage name="email" component="p" className={styles.error} />
              </div>

              {!isForgot && (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="password">Contraseña</label>
                  <div className={styles.passwordWrapper}>
                    <Field
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      className={[styles.input, styles.passwordInput, errors.password && touched.password ? styles.inputError : ''].join(' ')}
                      placeholder={isRegister ? 'Mínimo 6 caracteres' : '••••••••'}
                      autoComplete={isRegister ? 'new-password' : 'current-password'}
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword(v => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  <ErrorMessage name="password" component="p" className={styles.error} />
                </div>
              )}

              {isLogin && (
                <p className={styles.hint} style={{ marginBottom: 4, textAlign: 'right' }}>
                  <button type="button" className={styles.link} onClick={() => switchMode('forgot')}>
                    ¿Olvidaste tu contraseña?
                  </button>
                </p>
              )}

              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting
                  ? 'Cargando…'
                  : isLogin
                    ? 'Ingresar →'
                    : isRegister
                      ? 'Crear cuenta →'
                      : 'Enviar link →'}
              </button>
            </Form>
          )}
        </Formik>}

        {isLogin && (
          <>
            <div className={styles.separator}>
              <span>o continuar con</span>
            </div>

            {socialError && <p className={styles.error} style={{ marginBottom: 8 }}>{socialError}</p>}

            <div className={styles.socialRow}>
              <button
                type="button"
                className={styles.socialBtn}
                onClick={() => void handleGoogle()}
                disabled={socialLoading}
              >
                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Google
              </button>
              {magicEmailOpen ? (
                <button
                  type="button"
                  className={styles.socialBtn}
                  onClick={() => { setMagicEmailOpen(false); setMagicSent(false); setMagicEmail(''); setMagicError('') }}
                  disabled={socialLoading}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Credenciales
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.socialBtn}
                  onClick={handleMagicLinkOpen}
                  disabled={socialLoading}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  Magic Link
                </button>
              )}
            </div>
          </>
        )}

        <p className={styles.hint}>
          {isLogin ? (
            <>¿No tenés cuenta?{' '}
              <button type="button" className={styles.link} onClick={() => switchMode('register')}>
                Registrate gratis
              </button>
            </>
          ) : isRegister ? (
            <>¿Ya tenés cuenta?{' '}
              <button type="button" className={styles.link} onClick={() => switchMode('login')}>
                Iniciá sesión
              </button>
            </>
          ) : (
            <button type="button" className={styles.link} onClick={() => switchMode('login')}>
              ← Volver al inicio
            </button>
          )}
        </p>
      </div>
    </div>
  )
}
