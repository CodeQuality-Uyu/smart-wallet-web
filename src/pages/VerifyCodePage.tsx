// src/pages/VerifyCodePage.tsx

import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { useAuth } from '@/app/providers/AuthContext'
import { appConfig } from '@/app/config'
import styles from './VerifyCodePage.module.css'

const isFirestore = appConfig.backend === 'firestore'

const codeSchema = Yup.object({
  code: Yup.string()
    .matches(/^\d{6}$/, 'El código debe tener 6 dígitos.')
    .required('El código es requerido.'),
})

export default function VerifyCodePage(): React.ReactElement {
  const { verifyCode } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const email = (location.state as { email?: string } | null)?.email ?? ''

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.logo}>
          <div className={styles.logoMark}>🌿</div>
          <span className={styles.logoName}>SmartWallet</span>
        </div>
        <div className={styles.heroText}>
          <h1 className={styles.title}>Verificá<br />tu <em className={styles.em}>email</em></h1>
          <p className={styles.subtitle}>
            {isFirestore ? 'Te enviamos un link de verificación' : 'Te enviamos un código de 6 dígitos'}
          </p>
        </div>
      </div>

      <div className={styles.form}>
        {isFirestore ? (
          /* ── Firestore: email verification sent, user must click link then login ── */
          <>
            <h2 className={styles.formTitle}>Revisá tu bandeja</h2>
            {email && (
              <p className={styles.emailHint}>
                Enviamos un link de verificación a <strong>{email}</strong>
              </p>
            )}
            <p className={styles.emailHint} style={{ marginTop: 8 }}>
              Hacé click en el link del email para activar tu cuenta. Después volvé aquí para ingresar con tu email y contraseña.
            </p>
            <button
              className={styles.submitBtn}
              style={{ marginTop: 24 }}
              onClick={() => void navigate('/login')}
            >
              Ir al login →
            </button>
          </>
        ) : (
          /* ── MSW / default: 6-digit code flow ── */
          <>
            <h2 className={styles.formTitle}>Ingresá el código</h2>
            {email && (
              <p className={styles.emailHint}>Enviado a <strong>{email}</strong></p>
            )}
            <Formik
              initialValues={{ code: '' }}
              validationSchema={codeSchema}
              onSubmit={async (values, { setFieldError }) => {
                try {
                  await verifyCode(email, values.code.trim())
                  void navigate('/home', { replace: true })
                } catch (err) {
                  const message = err && typeof err === 'object' && 'message' in err
                    ? String((err as { message: string }).message)
                    : 'Verificación fallida. Intentá de nuevo.'
                  setFieldError('code', message)
                }
              }}
            >
              {({ isSubmitting, errors, touched }) => (
                <Form noValidate>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="code">Código de verificación</label>
                    <Field
                      id="code"
                      name="code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      className={[styles.input, errors.code && touched.code ? styles.inputError : ''].join(' ')}
                      placeholder="123456"
                      autoComplete="one-time-code"
                      autoFocus
                    />
                    <ErrorMessage name="code" component="p" className={styles.error} />
                  </div>
                  <p className={styles.demoHint}>Modo demo: usá <strong>123456</strong></p>
                  <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                    {isSubmitting ? 'Verificando…' : 'Verificar →'}
                  </button>
                </Form>
              )}
            </Formik>
          </>
        )}

        <p className={styles.hint}>
          <button
            type="button"
            className={styles.link}
            onClick={() => void navigate('/login')}
          >
            ← Volver al inicio
          </button>
        </p>
      </div>
    </div>
  )
}
