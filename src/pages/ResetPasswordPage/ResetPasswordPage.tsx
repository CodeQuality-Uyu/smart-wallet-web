// src/pages/ResetPasswordPage.tsx

import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { appConfig } from '@/app/config'
import styles from './ResetPasswordPage.module.css'

const resetSchema = Yup.object({
  password: Yup.string()
    .min(6, 'Mínimo 6 caracteres.')
    .required('La contraseña es requerida.'),
  confirm: Yup.string()
    .oneOf([Yup.ref('password')], 'Las contraseñas no coinciden.')
    .required('Confirmá tu contraseña.'),
})

// Only relevant for Firestore — MSW doesn't use this page
const isFirestore = appConfig.backend === 'firestore'

export default function ResetPasswordPage(): React.ReactElement {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const oobCode = searchParams.get('oobCode') ?? ''

  if (!isFirestore || !oobCode) {
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
          <span className={styles.logoName}>SmartWallet</span>
        </div>
        <div className={styles.heroText}>
          <h1 className={styles.title}>Nueva<br /><em className={styles.em}>contraseña</em></h1>
          <p className={styles.subtitle}>Elegí una contraseña segura</p>
        </div>
      </div>

      <div className={styles.form}>
        <h2 className={styles.formTitle}>Restablecer contraseña</h2>

        <Formik
          initialValues={{ password: '', confirm: '' }}
          validationSchema={resetSchema}
          onSubmit={async (values, { setFieldError }) => {
            try {
              const [{ confirmPasswordReset }, { firebaseAuth }] = await Promise.all([
                import('firebase/auth'),
                import('@/backend/firestore/config'),
              ])
              await confirmPasswordReset(firebaseAuth, oobCode, values.password)
              void navigate('/login?reset=true', { replace: true })
            } catch (err) {
              const message = err && typeof err === 'object' && 'message' in err
                ? String((err as { message: string }).message)
                : 'No se pudo restablecer la contraseña. El link puede haber expirado.'
              setFieldError('confirm', message)
            }
          }}
        >
          {({ isSubmitting, errors, touched }) => (
            <Form noValidate>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="password">Nueva contraseña</label>
                <Field
                  id="password"
                  name="password"
                  type="password"
                  className={[styles.input, errors.password && touched.password ? styles.inputError : ''].join(' ')}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  autoFocus
                />
                <ErrorMessage name="password" component="p" className={styles.error} />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="confirm">Confirmar contraseña</label>
                <Field
                  id="confirm"
                  name="confirm"
                  type="password"
                  className={[styles.input, errors.confirm && touched.confirm ? styles.inputError : ''].join(' ')}
                  placeholder="Repetí la contraseña"
                  autoComplete="new-password"
                />
                <ErrorMessage name="confirm" component="p" className={styles.error} />
              </div>

              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? 'Guardando…' : 'Guardar contraseña →'}
              </button>
            </Form>
          )}
        </Formik>

        <p className={styles.hint}>
          <button type="button" className={styles.link} onClick={() => void navigate('/login')}>
            ← Volver al login
          </button>
        </p>
      </div>
    </div>
  )
}
