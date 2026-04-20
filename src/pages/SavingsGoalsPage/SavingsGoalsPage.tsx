// src/pages/SavingsGoalsPage/SavingsGoalsPage.tsx
import React, { useState } from 'react'
import { SavingsGoalStatus, Currency } from '@/types/enums'
import type { SavingsGoal } from '@/types/models'
import styles from './SavingsGoalsPage.module.css'

const INITIAL_GOALS: SavingsGoal[] = [
  {
    id: '1',
    name: 'Viaje a Europa',
    icon: '✈️',
    targetAmount: 198400,
    savedAmount: 152300,
    currency: Currency.UYU,
    targetDate: '2026-12-01',
    status: SavingsGoalStatus.InProgress,
    active: true,
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-04-07T00:00:00Z',
  },
  {
    id: '2',
    name: 'Fondo de emergencia',
    icon: '🛡️',
    targetAmount: 112500,
    savedAmount: 89200,
    currency: Currency.UYU,
    targetDate: '2026-08-01',
    status: SavingsGoalStatus.InProgress,
    active: true,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-04-07T00:00:00Z',
  },
  {
    id: '3',
    name: 'MacBook Pro',
    icon: '💻',
    targetAmount: 1400,
    savedAmount: 1400,
    currency: Currency.USD,
    targetDate: '2026-06-01',
    status: SavingsGoalStatus.Completed,
    active: true,
    createdAt: '2025-12-01T00:00:00Z',
    updatedAt: '2026-03-20T00:00:00Z',
  },
  {
    id: '4',
    name: 'Curso de inglés',
    icon: '📚',
    targetAmount: 24000,
    savedAmount: 8500,
    currency: Currency.UYU,
    targetDate: '2026-05-15',
    status: SavingsGoalStatus.AtRisk,
    active: true,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-04-07T00:00:00Z',
  },
]

const CURRENCY_SYMBOL: Record<Currency, string> = {
  [Currency.UYU]: '$',
  [Currency.USD]: 'U$S',
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('es-UY')
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${months[d.getMonth()]} ${d.getFullYear()}`
}

function statusLabel(status: SavingsGoalStatus): string {
  switch (status) {
    case SavingsGoalStatus.InProgress: return 'En curso'
    case SavingsGoalStatus.Completed: return 'Completada'
    case SavingsGoalStatus.AtRisk: return 'En riesgo'
  }
}

function statusClass(status: SavingsGoalStatus, s: typeof styles): string {
  switch (status) {
    case SavingsGoalStatus.InProgress: return s.badgeInProgress
    case SavingsGoalStatus.Completed: return s.badgeCompleted
    case SavingsGoalStatus.AtRisk: return s.badgeAtRisk
  }
}

function progressColor(pct: number): string {
  if (pct < 30) return '#ef4444'          // red
  if (pct < 60) return '#f5b732'          // gold/yellow
  return '#10b981'                         // green
}

interface GoalForm {
  name: string
  icon: string
  targetAmount: string
  currency: Currency
  targetDate: string
}

const EMPTY_FORM: GoalForm = {
  name: '',
  icon: '🎯',
  targetAmount: '',
  currency: Currency.UYU,
  targetDate: '',
}

export default function SavingsGoalsPage(): React.ReactElement {
  const [goals, setGoals] = useState<SavingsGoal[]>(INITIAL_GOALS)
  const [showModal, setShowModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [form, setForm] = useState<GoalForm>(EMPTY_FORM)

  const totalUYU = goals.filter((g) => g.currency === Currency.UYU).reduce((sum, g) => sum + g.savedAmount, 0)
  const totalUSD = goals.filter((g) => g.currency === Currency.USD).reduce((sum, g) => sum + g.savedAmount, 0)
  const avgMonthlySaving = Math.round(totalUYU / 6)

  function openCreate(): void {
    setEditingGoal(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  function openEdit(goal: SavingsGoal): void {
    setEditingGoal(goal)
    setForm({
      name: goal.name,
      icon: goal.icon,
      targetAmount: String(goal.targetAmount),
      currency: goal.currency,
      targetDate: goal.targetDate,
    })
    setShowModal(true)
  }

  function closeModal(): void {
    setShowModal(false)
    setEditingGoal(null)
    setForm(EMPTY_FORM)
  }

  function handleDelete(id: string): void {
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }

  function handleChange(field: keyof GoalForm, value: string): void {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    const now = new Date().toISOString()
    if (editingGoal) {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === editingGoal.id
            ? {
                ...g,
                name: form.name,
                icon: form.icon,
                targetAmount: Number(form.targetAmount),
                currency: form.currency,
                targetDate: form.targetDate,
                updatedAt: now,
              }
            : g
        )
      )
    } else {
      const newGoal: SavingsGoal = {
        id: String(Date.now()),
        name: form.name,
        icon: form.icon,
        targetAmount: Number(form.targetAmount),
        savedAmount: 0,
        currency: form.currency,
        targetDate: form.targetDate,
        status: SavingsGoalStatus.InProgress,
        active: true,
        createdAt: now,
        updatedAt: now,
      }
      setGoals((prev) => [...prev, newGoal])
    }
    closeModal()
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Metas de Ahorro</h1>
          <p className={styles.subtitle}>Definí objetivos y seguí tu progreso hacia cada meta</p>
        </div>
        <button className={styles.newBtn} type="button" onClick={openCreate}>
          ＋ Nueva meta
        </button>
      </header>

      {/* Stat cards — 3 cards: UYU, USD, ahorro mensual */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statCurrencyTag}>UYU</span>
          <span className={styles.statLabel}>Total ahorrado</span>
          <span className={styles.statValue}>${formatAmount(totalUYU)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statCurrencyTag}>USD</span>
          <span className={styles.statLabel}>Total ahorrado</span>
          <span className={styles.statValue}>U$S {formatAmount(totalUSD)}</span>
        </div>
        <div className={`${styles.statCard} ${styles.statGold}`}>
          <span className={styles.statLabel}>Ahorro mensual prom.</span>
          <span className={styles.statValue}>${formatAmount(avgMonthlySaving)}</span>
          <span className={styles.statBadge}>+5.5% vs año pasado</span>
        </div>
      </div>

      {/* Goals list */}
      <div className={styles.goalsList}>
        {goals.map((goal) => {
          const pct = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100))
          const sym = CURRENCY_SYMBOL[goal.currency]
          const barColor = progressColor(pct)
          return (
            <div key={goal.id} className={styles.goalCard}>
              <div className={styles.goalIconBox}>
                <span className={styles.goalIcon}>{goal.icon}</span>
              </div>
              <div className={styles.goalInfo}>
                <div className={styles.goalTop}>
                  <span className={styles.goalName}>{goal.name}</span>
                  <span className={`${styles.badge} ${statusClass(goal.status, styles)}`}>
                    {statusLabel(goal.status)}
                  </span>
                </div>
                <span className={styles.goalDate}>
                  📅 {formatDate(goal.targetDate)} · {goal.currency}
                </span>
                <div className={styles.goalProgress}>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${pct}%`, background: barColor }}
                    />
                  </div>
                  <span className={styles.progressPct} style={{ color: barColor }}>{pct}%</span>
                </div>
              </div>
              <div className={styles.goalAmounts}>
                <span className={styles.goalSaved}>{sym} {formatAmount(goal.savedAmount)}</span>
                <span className={styles.goalTarget}>de {sym} {formatAmount(goal.targetAmount)}</span>
              </div>
              <div className={styles.goalActions}>
                <button
                  className={styles.actionBtn}
                  type="button"
                  title="Editar"
                  onClick={() => openEdit(goal)}
                >
                  ✏️
                </button>
                <button
                  className={`${styles.actionBtn} ${styles.actionDelete}`}
                  type="button"
                  title="Eliminar"
                  onClick={() => handleDelete(goal.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tip card */}
      <div className={styles.tipCard}>
        <span className={styles.tipIcon}>💡</span>
        <div>
          <strong>Tip de ahorro</strong>
          <p className={styles.tipText}>
            Automatizá tus aportes al día de cobro para ganar consistencia. Con el 15% de tus ingresos llegás antes a cada meta.
          </p>
        </div>
      </div>

      {/* Create / Edit modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingGoal ? 'Editar meta' : 'Nueva meta de ahorro'}
              </h2>
              <button className={styles.modalClose} type="button" onClick={closeModal}>✕</button>
            </div>
            <form className={styles.modalForm} onSubmit={handleSubmit}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Ícono</label>
                  <input
                    className={`${styles.formInput} ${styles.formInputIcon}`}
                    type="text"
                    value={form.icon}
                    maxLength={2}
                    onChange={(e) => handleChange('icon', e.target.value)}
                    placeholder="🎯"
                  />
                </div>
                <div className={`${styles.formGroup} ${styles.formGroupFlex}`}>
                  <label className={styles.formLabel}>Nombre de la meta</label>
                  <input
                    className={styles.formInput}
                    type="text"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Ej: Vacaciones en Brasil"
                    required
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={`${styles.formGroup} ${styles.formGroupFlex}`}>
                  <label className={styles.formLabel}>Monto objetivo</label>
                  <input
                    className={styles.formInput}
                    type="number"
                    min="1"
                    value={form.targetAmount}
                    onChange={(e) => handleChange('targetAmount', e.target.value)}
                    placeholder="50000"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Moneda</label>
                  <div className={styles.currencyToggle}>
                    {([Currency.UYU, Currency.USD] as Currency[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={[styles.currencyBtn, form.currency === c ? styles.currencyBtnActive : ''].join(' ')}
                        onClick={() => handleChange('currency', c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Fecha objetivo</label>
                <div className={styles.dateWrapper}>
                  <span className={styles.dateIcon}>📅</span>
                  <input
                    className={`${styles.formInput} ${styles.formInputDate}`}
                    type="date"
                    value={form.targetDate}
                    onChange={(e) => handleChange('targetDate', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className={styles.submitBtn}>
                  {editingGoal ? 'Guardar cambios' : 'Crear meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
