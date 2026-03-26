// src/pages/SalariesPage.tsx

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { salariesService, type Salary } from '@/services/salariesService'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatCurrency } from '@/utils/formatCurrency'
import styles from './SalariesPage.module.css'

const CURRENCIES = ['UYU', 'USD']
const TODAY = new Date().toISOString().split('T')[0]

interface FormState {
  name: string
  amount: string
  currency: string
}

const EMPTY_FORM: FormState = {
  name: '',
  amount: '',
  currency: 'UYU',
}

export default function SalariesPage(): React.ReactElement {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState('')

  const { data: salaries = [], isLoading } = useQuery({
    queryKey: ['salaries'],
    queryFn: () => salariesService.list(),
  })

  const { mutateAsync: createSalary, isPending: creating } = useMutation({
    mutationFn: () => salariesService.create({
      amount: Number(form.amount),
      currency: form.currency,
      date: TODAY,
      notes: form.name,
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['salaries'] })
      setShowForm(false)
      setForm(EMPTY_FORM)
    },
  })

  const { mutateAsync: deleteSalary } = useMutation({
    mutationFn: (id: string) => salariesService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['salaries'] })
    },
  })

  if (isLoading) return <LoadingSpinner fullPage />

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    if (!form.name.trim()) {
      setFormError('El nombre es requerido.')
      return
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setFormError('El monto debe ser mayor a 0.')
      return
    }
    setFormError('')
    await createSalary()
  }

  async function handleDelete(salary: Salary): Promise<void> {
    if (!window.confirm(`¿Eliminar sueldo de ${formatCurrency(salary.amount, salary.currency)} ${salary.currency}?`)) return
    await deleteSalary(salary.id)
  }

  function setField(key: keyof FormState, value: string): void {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div>
      <PageHeader title="Sueldos" subtitle="Registrá tus ingresos mensuales" showBack />

      <div className={styles.body}>
        {showForm && (
          <form className={styles.form} onSubmit={(e) => { void handleSubmit(e) }} noValidate>
            <h2 className={styles.formTitle}>Nuevo ingreso</h2>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="sal-name">Nombre</label>
              <input
                id="sal-name"
                type="text"
                className={styles.input}
                placeholder="ej. Sueldo marzo"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
              />
            </div>

            <div className={styles.row}>
              <div className={styles.fieldGroup} style={{ flex: 1 }}>
                <label className={styles.label} htmlFor="sal-amount">Monto</label>
                <input
                  id="sal-amount"
                  type="number"
                  min="0"
                  step="any"
                  className={styles.input}
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => setField('amount', e.target.value)}
                />
              </div>
              <div className={styles.fieldGroup} style={{ width: 90 }}>
                <label className={styles.label} htmlFor="sal-currency">Moneda</label>
                <select
                  id="sal-currency"
                  className={styles.input}
                  value={form.currency}
                  onChange={(e) => setField('currency', e.target.value)}
                >
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {formError && <p className={styles.error}>{formError}</p>}

            <div className={styles.actions}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError('') }}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="secondary" size="sm" loading={creating}>
                Guardar
              </Button>
            </div>
          </form>
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
