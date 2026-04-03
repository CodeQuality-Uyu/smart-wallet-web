// src/pages/ProfilePage.tsx

import React, { useState } from 'react'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import { FormField, TextInput, SelectInput } from '@/components/ui/FormField'
import * as Yup from 'yup'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/providers/AuthContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { salariesService, type Salary, type UpdateSalaryPayload } from '@/services/salariesService'
import { formatCurrency } from '@/utils/formatCurrency'
import { Currency } from '@/types/enums'
import styles from './ProfilePage.module.css'

// ─── Preferences (localStorage) ─────────────────────────────

const PREFS_KEY = 'profile_prefs'

interface Preferences {
  pushNotifications: boolean
  weeklySummary: boolean
  budgetAlerts: boolean
  darkMode: boolean
}

function loadPrefs(): Preferences {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    if (raw) return JSON.parse(raw) as Preferences
  } catch { /* ignore */ }
  return { pushNotifications: true, weeklySummary: true, budgetAlerts: false, darkMode: false }
}

function savePrefs(prefs: Preferences): void {
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}

// ─── Profile form schema ─────────────────────────────────────

const profileSchema = Yup.object({
  firstName: Yup.string().trim().required('El nombre es requerido.'),
  lastName: Yup.string().trim().required('El apellido es requerido.'),
})

type ProfileFormValues = { firstName: string; lastName: string }

// ─── Salary form schema ──────────────────────────────────────

const salarySchema = Yup.object({
  name: Yup.string().trim().required('El nombre es requerido.'),
  amount: Yup.number()
    .typeError('Ingresá un número válido.')
    .positive('El monto debe ser mayor a 0.')
    .required('El monto es requerido.'),
  currency: Yup.string().oneOf(['UYU', 'USD']).required(),
})

type SalaryFormValues = Yup.InferType<typeof salarySchema>

const SALARY_INITIAL: SalaryFormValues = { name: '', amount: 0, currency: 'UYU' }
const TODAY = new Date().toISOString().split('T')[0]

// ─── Helpers ─────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (name.slice(0, 2) || '?').toUpperCase()
}

function splitName(fullName: string): ProfileFormValues {
  const idx = fullName.trim().indexOf(' ')
  if (idx === -1) return { firstName: fullName.trim(), lastName: '' }
  return { firstName: fullName.slice(0, idx).trim(), lastName: fullName.slice(idx + 1).trim() }
}

// ─── Component ───────────────────────────────────────────────

export default function ProfilePage(): React.ReactElement {
  const { user, updateProfile, logout } = useAuth()
  const queryClient = useQueryClient()
  const [prefs, setPrefs] = useState<Preferences>(loadPrefs)
  const [showSalaryForm, setShowSalaryForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { data: salaries = [], isLoading: salariesLoading } = useQuery({
    queryKey: ['salaries'],
    queryFn: () => salariesService.list(),
  })

  const { mutateAsync: createSalary } = useMutation({
    mutationFn: (values: SalaryFormValues) =>
      salariesService.create({ amount: values.amount, currency: values.currency, date: TODAY, notes: values.name }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['salaries'] }) },
  })

  const { mutateAsync: updateSalary } = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSalaryPayload }) =>
      salariesService.update(id, payload),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['salaries'] }) },
  })

  const { mutateAsync: deleteSalary } = useMutation({
    mutationFn: (id: string) => salariesService.remove(id),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['salaries'] }) },
  })

  const initials = user ? getInitials(user.name) : '?'
  const memberSince = 'Enero 2025'

  function togglePref(key: keyof Preferences): void {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      savePrefs(next)
      return next
    })
  }

  async function handleProfileSubmit(values: ProfileFormValues): Promise<void> {
    const fullName = [values.firstName, values.lastName].filter(Boolean).join(' ')
    await updateProfile(fullName)
  }

  async function handleSalaryCreate(values: SalaryFormValues): Promise<void> {
    await createSalary(values)
    setShowSalaryForm(false)
  }

  async function handleSalaryEdit(salary: Salary, values: SalaryFormValues): Promise<void> {
    await updateSalary({ id: salary.id, payload: { amount: values.amount, currency: values.currency, notes: values.name } })
    setEditingId(null)
  }

  async function handleDeleteSalary(salary: Salary): Promise<void> {
    if (!window.confirm(`¿Eliminar ingreso de ${formatCurrency(salary.amount, salary.currency as Currency)} ${salary.currency}?`)) return
    await deleteSalary(salary.id)
  }

  function handleDeleteAccount(): void {
    if (window.confirm('¿Estás seguro? Esta acción eliminará tu cuenta y todos tus datos permanentemente.')) {
      logout()
    }
  }

  if (!user) return <div />

  return (
    <div className={styles.body}>
      <PageHeader title="Perfil" subtitle="Administrá tu información personal y preferencias" />

      {/* ── Banner ── */}
      <div className={styles.banner}>
        <div className={styles.avatarWrap}>
          <span className={styles.avatarInitials}>{initials}</span>
        </div>
        <div className={styles.bannerInfo}>
          <h3 className={styles.bannerName}>{user.name}</h3>
          <p className={styles.bannerEmail}>{user.email}</p>
          <p className={styles.bannerSince}>Miembro desde {memberSince}</p>
        </div>
        <button type="button" className={styles.editPhotoBtn}>Editar foto</button>
      </div>

      {/* ── Profile form (name + email only) ── */}
      <Formik<ProfileFormValues>
        initialValues={splitName(user.name)}
        validationSchema={profileSchema}
        onSubmit={handleProfileSubmit}
        enableReinitialize
      >
        {({ isSubmitting, isValid, dirty, resetForm }) => (
          <Form noValidate>
            <div className={styles.fieldsGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="profile-firstName">Nombre</label>
                <Field id="profile-firstName" name="firstName" type="text" className={styles.input} placeholder="Tu nombre" />
                <ErrorMessage name="firstName" component="p" className={styles.fieldError} />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="profile-lastName">Apellido</label>
                <Field id="profile-lastName" name="lastName" type="text" className={styles.input} placeholder="Tu apellido" />
                <ErrorMessage name="lastName" component="p" className={styles.fieldError} />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="profile-email">Email</label>
                <input id="profile-email" type="email" className={`${styles.input} ${styles.inputReadonly}`} value={user.email} readOnly />
              </div>
            </div>

            {dirty && (
              <div className={styles.profileFormActions}>
                <button type="button" className={styles.incomeFormCancel} onClick={() => resetForm()} disabled={isSubmitting}>
                  Cancelar
                </button>
                <button type="submit" className={styles.incomeFormSave} disabled={!isValid || isSubmitting}>
                  {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            )}
          </Form>
        )}
      </Formik>

      {/* ── Preferences ── */}
      <div className={styles.prefsSection}>
        <h3 className={styles.prefsTitle}>Preferencias</h3>
        <PreferenceRow
          label="Notificaciones push"
          description="Recibí alertas de gastos y metas"
          value={prefs.pushNotifications}
          onToggle={() => togglePref('pushNotifications')}
        />
        <PreferenceRow
          label="Resumen semanal"
          description="Email con tu resumen financiero cada lunes"
          value={prefs.weeklySummary}
          onToggle={() => togglePref('weeklySummary')}
        />
        <PreferenceRow
          label="Alertas de exceso"
          description="Avisarte cuando superes el 80% de tu presupuesto"
          value={prefs.budgetAlerts}
          onToggle={() => togglePref('budgetAlerts')}
        />
        <PreferenceRow
          label="Modo oscuro"
          description="Tema oscuro para la aplicación"
          value={prefs.darkMode}
          onToggle={() => togglePref('darkMode')}
          last
        />
      </div>

      {/* ── Ingresos ── */}
      <div className={styles.incomesSection}>
        <div className={styles.incomesHeader}>
          <h3 className={styles.incomesTitle}>Ingresos</h3>
          {!showSalaryForm && (
            <button type="button" className={styles.addIncomeBtn} onClick={() => setShowSalaryForm(true)}>
              ＋ Nuevo ingreso
            </button>
          )}
        </div>

        {showSalaryForm && (
          <SalaryForm
            onSubmit={handleSalaryCreate}
            onCancel={() => setShowSalaryForm(false)}
          />
        )}

        {salariesLoading ? (
          <LoadingSpinner />
        ) : (
          <div className={styles.incomeList}>
            {salaries.length === 0 && !showSalaryForm && (
              <p className={styles.incomeEmpty}>No hay ingresos registrados.</p>
            )}
            {salaries.map((s) =>
              editingId === s.id ? (
                <SalaryForm
                  key={s.id}
                  initialValues={{ name: s.notes, amount: s.amount, currency: s.currency as 'UYU' | 'USD' }}
                  onSubmit={(values) => handleSalaryEdit(s, values)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div key={s.id} className={styles.incomeItem}>
                  <div className={`${styles.incomeItemIcon} ${s.currency === 'USD' ? styles.incomeItemIconUSD : styles.incomeItemIconUYU}`}>
                    {s.currency === 'USD' ? '💵' : '💰'}
                  </div>
                  <div className={styles.incomeItemInfo}>
                    <p className={styles.incomeItemName}>{s.notes || '—'}</p>
                    <p className={styles.incomeItemAmount}>
                      {CURRENCY_SYMBOL[s.currency] ?? s.currency} {s.amount.toLocaleString('es-UY')}
                    </p>
                  </div>
                  <div className={styles.incomeItemActions}>
                    <button
                      type="button"
                      className={styles.incomeEditBtn}
                      onClick={() => { setEditingId(s.id); setShowSalaryForm(false) }}
                      aria-label="Editar ingreso"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className={styles.incomeDeleteBtn}
                      onClick={() => { void handleDeleteSalary(s) }}
                      aria-label="Eliminar ingreso"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ── Danger zone ── */}
      <div className={styles.dangerZone}>
        <h3 className={styles.dangerTitle}>Zona de peligro</h3>
        <p className={styles.dangerDesc}>Estas acciones son irreversibles. Procedé con cuidado.</p>
        <div className={styles.dangerActions}>
          <div className={styles.dangerItem}>
            <div>
              <p className={styles.dangerItemLabel}>Eliminar cuenta</p>
              <p className={styles.dangerItemDesc}>Borra permanentemente tu cuenta y todos tus datos</p>
            </div>
            <button type="button" className={styles.dangerBtnRed} onClick={handleDeleteAccount}>
              Eliminar cuenta
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SalaryForm ───────────────────────────────────────────────

interface SalaryFormProps {
  initialValues?: SalaryFormValues
  onSubmit: (values: SalaryFormValues) => Promise<void>
  onCancel: () => void
}

const CURRENCY_SYMBOL: Record<string, string> = { UYU: '$', USD: 'U$S' }

function SalaryForm({ initialValues = SALARY_INITIAL, onSubmit, onCancel }: SalaryFormProps): React.ReactElement {
  return (
    <Formik<SalaryFormValues>
      initialValues={initialValues}
      validationSchema={salarySchema}
      onSubmit={onSubmit}
      enableReinitialize
    >
      {({ isSubmitting, values, setFieldValue }) => (
        <Form noValidate>
          <div className={styles.fieldsGrid}>
            <FormField name="name" label="Nombre">
              <TextInput name="name" placeholder="ej. Sueldo" />
            </FormField>
            <FormField name="amount" label={`Monto (${CURRENCY_SYMBOL[values.currency] ?? values.currency})`}>
              <TextInput
                name="amount"
                type="number"
                min="0"
                step="any"
                placeholder="0"
                onFocus={(e) => {
                  if (e.target.value === '0') void setFieldValue('amount', '')
                }}
              />
            </FormField>
            <FormField name="currency" label="Moneda">
              <SelectInput name="currency" options={[
                { value: 'UYU', label: 'UYU' },
                { value: 'USD', label: 'USD' },
              ]} />
            </FormField>
          </div>
          <div className={styles.incomeFormActions}>
            <button type="button" className={styles.incomeFormCancel} onClick={onCancel}>Cancelar</button>
            <button type="submit" className={styles.incomeFormSave} disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </Form>
      )}
    </Formik>
  )
}

// ─── PreferenceRow ────────────────────────────────────────────

interface PreferenceRowProps {
  label: string
  description: string
  value: boolean
  onToggle: () => void
  last?: boolean
}

function PreferenceRow({ label, description, value, onToggle, last = false }: PreferenceRowProps): React.ReactElement {
  return (
    <div className={`${styles.prefRow} ${last ? styles.prefRowLast : ''}`}>
      <div className={styles.prefInfo}>
        <p className={styles.prefLabel}>{label}</p>
        <p className={styles.prefDesc}>{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        className={`${styles.toggle} ${value ? styles.toggleOn : styles.toggleOff}`}
        onClick={onToggle}
        aria-label={label}
      >
        <span className={styles.toggleKnob} />
      </button>
    </div>
  )
}
