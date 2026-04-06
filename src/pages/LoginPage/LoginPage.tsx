import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import styles from './LoginPage.module.css'
import { useAuth } from '@/app/providers/AuthContext'

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
  const { login, register, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const justVerified = searchParams.get('verified') === 'true'
  const justReset = searchParams.get('reset') === 'true'

  const [mode, setMode] = useState<Mode>('login')
  const [successMsg, setSuccessMsg] = useState(
    justVerified ? '¡Email verificado! Ya podés ingresar.' :
    justReset ? '¡Contraseña restablecida! Ya podés ingresar.' : ''
  )

  const isLogin = mode === 'login'
  const isRegister = mode === 'register'
  const isForgot = mode === 'forgot'

  const schema = isLogin ? loginSchema : isRegister ? registerSchema : forgotSchema

  function switchMode(next: Mode): void {
    setMode(next)
    setSuccessMsg('')
  }

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
            {isLogin
              ? 'Tu dinero te está esperando'
              : isRegister
                ? 'Creá tu cuenta y empezá a trackear'
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
      </div>

      <div className={styles.form}>
        <h2 className={styles.formTitle}>
          {isLogin ? 'Ingresá' : isRegister ? 'Creá tu cuenta' : 'Recuperar contraseña'}
        </h2>

        {successMsg && <p className={styles.success}>{successMsg}</p>}

        <Formik
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
                  <Field
                    id="password"
                    name="password"
                    type="password"
                    className={[styles.input, errors.password && touched.password ? styles.inputError : ''].join(' ')}
                    placeholder={isRegister ? 'Mínimo 6 caracteres' : '••••••••'}
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                  />
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
        </Formik>

        <p className={styles.hint}>
          {isLogin ? (
            <>¿No tenés cuenta?{' '}
              <button type="button" className={styles.link} onClick={() => switchMode('register')}>
                Registrate
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
