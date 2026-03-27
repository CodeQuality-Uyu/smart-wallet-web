// src/pages/SalariesPage.tsx

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { salariesService, type Salary } from '@/services/salariesService'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatCurrency } from '@/utils/formatCurrency'
import styles from './SalariesPage.module.css'

const CURRENCIES = ['UYU', 'USD']
const TODAY = new Date().toISOString().split('T')[0]

const salarySchema = Yup.object({
  name: Yup.string().trim().required('El nombre es requerido.'),
  amount: Yup.number()
    .typeError('Ingresá un número válido.')
    .positive('El monto debe ser mayor a 0.')
    .required('El monto es requerido.'),
  currency: Yup.string().oneOf(CURRENCIES).required(),
})

type SalaryFormValues = Yup.InferType<typeof salarySchema>

const INITIAL_VALUES: SalaryFormValues = { name: '', amount: 0, currency: 'UYU' }

export default function SalariesPage(): React.ReactElement {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const { data: salaries = [], isLoading } = useQuery({
    queryKey: ['salaries'],
    queryFn: () => salariesService.list(),
  })

  const { mutateAsync: createSalary } = useMutation({
    mutationFn: (values: SalaryFormValues) => salariesService.create({
      amount: values.amount,
      currency: values.currency,
      date: TODAY,
      notes: values.name,
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['salaries'] })
      setShowForm(false)
    },
  })

  const { mutateAsync: deleteSalary } = useMutation({
    mutationFn: (id: string) => salariesService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['salaries'] })
    },
  })

  if (isLoading) return <LoadingSpinner fullPage />

  async function handleDelete(salary: Salary): Promise<void> {
    if (!window.confirm(`¿Eliminar sueldo de ${formatCurrency(salary.amount, salary.currency)} ${salary.currency}?`)) return
    await deleteSalary(salary.id)
  }

  return (
    <div>
      <PageHeader title="Sueldos" subtitle="Registrá tus ingresos mensuales" showBack />

      <div className={styles.body}>
        {showForm && (
          <Formik
            initialValues={INITIAL_VALUES}
            validationSchema={salarySchema}
            onSubmit={async (values) => {
              await createSalary(values)
            }}
          >
            {({ isSubmitting, errors, touched }) => (
              <Form className={styles.form} noValidate>
                <h2 className={styles.formTitle}>Nuevo ingreso</h2>

                <div className={styles.fieldGroup}>
                  <label className={styles.label} htmlFor="sal-name">Nombre</label>
                  <Field
                    id="sal-name"
                    name="name"
                    type="text"
                    className={styles.input}
                    placeholder="ej. Sueldo marzo"
                  />
                  <ErrorMessage name="name" component="p" className={styles.error} />
                </div>

                <div className={styles.row}>
                  <div className={styles.fieldGroup} style={{ flex: 1 }}>
                    <label className={styles.label} htmlFor="sal-amount">Monto</label>
                    <Field
                      id="sal-amount"
                      name="amount"
                      type="number"
                      min="0"
                      step="any"
                      className={[styles.input, errors.amount && touched.amount ? styles.inputError : ''].join(' ')}
                      placeholder="0"
                    />
                    <ErrorMessage name="amount" component="p" className={styles.error} />
                  </div>
                  <div className={styles.fieldGroup} style={{ width: 90 }}>
                    <label className={styles.label} htmlFor="sal-currency">Moneda</label>
                    <Field
                      id="sal-currency"
                      name="currency"
                      as="select"
                      className={styles.input}
                    >
                      {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </Field>
                  </div>
                </div>

                <div className={styles.actions}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowForm(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" variant="secondary" size="sm" loading={isSubmitting}>
                    Guardar
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        )}

        {!showForm && (
          <button className={styles.addBtn} onClick={() => setShowForm(true)}>
            ＋ Registrar ingreso
          </button>
        )}

        <div className={styles.list}>
          {salaries.length === 0 && (
            <p className={styles.empty}>No hay ingresos registrados.</p>
          )}
          {salaries.map((s) => (
            <div key={s.id} className={styles.item}>
              <div className={styles.itemLeft}>
                <span className={styles.itemCurrencyBadge}>{s.currency}</span>
                <div>
                  <p className={styles.itemAmount}>
                    {formatCurrency(s.amount, s.currency)}
                  </p>
                  {s.notes && <p className={styles.itemNotes}>{s.notes}</p>}
                </div>
              </div>
              <div className={styles.itemRight}>
                <p className={styles.itemDate}>{formatDate(s.date)}</p>
                <button
                  className={styles.deleteBtn}
                  onClick={() => { void handleDelete(s) }}
                  aria-label="Eliminar ingreso"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}
