import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { markOnboardingComplete, isOnboardingSocial, clearOnboardingSocial } from '@/app/router'
import { useAuth } from '@/app/providers/AuthContext'
import styles from './OnboardingPage.module.css'

interface StepConfig {
  emoji: string
  headline: string
  subtitle: string
}

const STEPS: StepConfig[] = [
  { emoji: '💰', headline: '¿Cuánto ganás\npor mes?', subtitle: 'Así calculamos tu capacidad de ahorro mensual' },
  { emoji: '🏷️', headline: 'Organizá\ntus gastos', subtitle: 'Elegí las categorías que más usás en tu día a día' },
  { emoji: '🐷', headline: 'Tu meta\nde ahorro', subtitle: 'Definí un porcentaje de tu ingreso para ahorrar cada mes' },
]

const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Comida', icon: '🍔', selected: false },
  { id: 'housing', name: 'Vivienda', icon: '🏠', selected: false },
  { id: 'transport', name: 'Transporte', icon: '🚗', selected: false },
  { id: 'leisure', name: 'Ocio', icon: '🎮', selected: false },
  { id: 'health', name: 'Salud', icon: '💊', selected: false },
  { id: 'clothing', name: 'Ropa', icon: '👕', selected: false },
  { id: 'pets', name: 'Mascotas', icon: '🐾', selected: false },
  { id: 'services', name: 'Servicios', icon: '📱', selected: false },
  { id: 'education', name: 'Educación', icon: '📚', selected: false },
]

const SAVINGS_OPTIONS = [10, 20, 30] as const

export default function OnboardingPage(): React.ReactElement {
  const navigate = useNavigate()
  const { updateProfile } = useAuth()
  const needsName = isOnboardingSocial()

  // step index: needsName → step 0 = name, steps 1-3 = income/categories/savings
  //             !needsName → step 0 = income, steps 1-2 = categories/savings
  const [step, setStep] = useState(0)

  // Step 0 (social only): name
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [nameError, setNameError] = useState('')

  // Income state (step 0 or 1 depending on flow)
  const [incomeUYU, setIncomeUYU] = useState('')
  const [incomeUSD, setIncomeUSD] = useState('')

  // Step 2 state
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)

  // Step 3 state
  const [savingsPercent, setSavingsPercent] = useState(20)
  const [customPercent, setCustomPercent] = useState(false)

  const selectedCount = categories.filter(c => c.selected).length

  const toggleCategory = (id: string): void => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c))
  }

  const savingsUYU = useMemo(() => {
    const income = parseFloat(incomeUYU.replace(/[^0-9.]/g, '')) || 0
    return Math.round(income * savingsPercent / 100)
  }, [incomeUYU, savingsPercent])

  const savingsUSD = useMemo(() => {
    const income = parseFloat(incomeUSD.replace(/[^0-9.]/g, '')) || 0
    return Math.round(income * savingsPercent / 100)
  }, [incomeUSD, savingsPercent])

  const yearlyUYU = savingsUYU * 12
  const yearlyUSD = savingsUSD * 12

  // Total steps: 4 if social (name + income + categories + savings), 3 otherwise
  const totalSteps = needsName ? 4 : 3
  // Map step index to STEPS config index (shift by 1 when needsName)
  const configIndex = needsName ? Math.max(0, step - 1) : step
  const current = STEPS[Math.min(configIndex, STEPS.length - 1)]
  const progressWidth = `${((step + 1) / totalSteps) * 100}%`

  // Determine which "logical step" we're on
  const isNameStep = needsName && step === 0
  const incomeStep = needsName ? 1 : 0
  const categoriesStep = needsName ? 2 : 1
  const savingsStep = needsName ? 3 : 2

  const canContinue = isNameStep
    ? (firstName.trim() !== '' && lastName.trim() !== '')
    : step === incomeStep
      ? (incomeUYU !== '' || incomeUSD !== '')
      : step === categoriesStep
        ? selectedCount > 0
        : true

  async function handleContinue(): Promise<void> {
    if (isNameStep) {
      setNameError('')
      if (!firstName.trim() || !lastName.trim()) {
        setNameError('Completá tu nombre y apellido para continuar.')
        return
      }
      await updateProfile(`${firstName.trim()} ${lastName.trim()}`)
      clearOnboardingSocial()
    }
    setStep(s => s + 1)
  }

  function handleFinish(): void {
    markOnboardingComplete()
    void navigate('/home', { replace: true })
  }

  return (
    <div className={styles.page}>
      {/* Left panel */}
      <div className={styles.hero}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />

        <div className={styles.heroContent}>
          <div className={styles.heroEmoji}>{current.emoji}</div>
          <h1 className={styles.heroTitle}>
            {current.headline.split('\n').map((line, i) => (
              <React.Fragment key={i}>{i > 0 && <br />}{line}</React.Fragment>
            ))}
          </h1>
          <p className={styles.heroSubtitle}>{current.subtitle}</p>
        </div>

        <div className={styles.dots}>
          {STEPS.map((_, i) => (
            <span key={i} className={`${styles.dot} ${i === step ? styles.dotActive : ''}`} />
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className={styles.form}>
        {/* Progress bar */}
        <div className={styles.progressRow}>
          <span className={styles.progressLabel}>Paso {step + 1} de {totalSteps}</span>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: progressWidth }} />
          </div>
        </div>

        {/* Step 0 (social only): Name */}
        {isNameStep && (
          <div className={styles.stepContent}>
            <h2 className={styles.formTitle}>Tu nombre</h2>
            <p className={styles.formSubtitle}>
              Completá tus datos para personalizar tu cuenta
            </p>

            <div className={styles.nameRow}>
              <div className={styles.field}>
                <label className={styles.label}>Nombre</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Tu nombre"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  autoComplete="given-name"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Apellido</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Tu apellido"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  autoComplete="family-name"
                />
              </div>
            </div>
            {nameError && <p className={styles.fieldError}>{nameError}</p>}
          </div>
        )}

        {/* Income step */}
        {step === incomeStep && (
          <div className={styles.stepContent}>
            <h2 className={styles.formTitle}>Tus ingresos</h2>
            <p className={styles.formSubtitle}>
              Necesitamos saber cuánto ganás para calcular la meta de ahorro
            </p>

            <div className={styles.field}>
              <label className={styles.label}>Ingreso en UYU</label>
              <div className={styles.inputLarge}>
                <span className={styles.inputPrefix}>$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.inputNum}
                  placeholder="65,000"
                  value={incomeUYU}
                  onChange={e => setIncomeUYU(e.target.value.replace(/[^0-9]/g, ''))}
                />
              </div>
              <span className={styles.inputHint}>Ingreso mensual en pesos uruguayos</span>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Ingreso en USD</label>
              <div className={styles.inputLarge}>
                <span className={styles.inputPrefix}>U$S</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.inputNum}
                  placeholder="3,200"
                  value={incomeUSD}
                  onChange={e => setIncomeUSD(e.target.value.replace(/[^0-9]/g, ''))}
                />
              </div>
              <span className={styles.inputHint}>Ingreso mensual en dólares (opcional)</span>
            </div>
          </div>
        )}

        {/* Categories step */}
        {step === categoriesStep && (
          <div className={styles.stepContent}>
            <h2 className={styles.formTitle}>Tus categorías</h2>
            <p className={styles.formSubtitle}>
              Seleccioná las que usás — después podés agregar más
            </p>

            <div className={styles.categoryGrid}>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={`${styles.categoryCard} ${cat.selected ? styles.categorySelected : ''}`}
                  onClick={() => toggleCategory(cat.id)}
                >
                  <span className={styles.categoryIcon}>{cat.icon}</span>
                  <span className={styles.categoryName}>{cat.name}</span>
                </button>
              ))}
            </div>

            <p className={styles.selectedCount}>{selectedCount} categorías seleccionadas</p>
          </div>
        )}

        {/* Savings goal step */}
        {step === savingsStep && (
          <div className={styles.stepContent}>
            <h2 className={styles.formTitle}>Meta de ahorro</h2>
            <p className={styles.formSubtitle}>
              Elegí un porcentaje de tu ingreso para ahorrar cada mes
            </p>

            <div className={styles.savingsPills}>
              {SAVINGS_OPTIONS.map(pct => (
                <button
                  key={pct}
                  type="button"
                  className={`${styles.savingsPill} ${!customPercent && savingsPercent === pct ? styles.savingsPillActive : ''}`}
                  onClick={() => { setSavingsPercent(pct); setCustomPercent(false) }}
                >
                  {pct}%
                </button>
              ))}
              <button
                type="button"
                className={`${styles.savingsPill} ${customPercent ? styles.savingsPillActive : ''}`}
                onClick={() => setCustomPercent(true)}
              >
                Custom
              </button>
            </div>

            {customPercent && (
              <div className={styles.customInput}>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={savingsPercent}
                  onChange={e => setSavingsPercent(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                  className={styles.customField}
                />
                <span className={styles.customSuffix}>%</span>
              </div>
            )}

            {/* Ring gauge */}
            <div className={styles.ringContainer}>
              <svg className={styles.ring} viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#e8e2d4" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="52"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 52}`}
                  strokeDashoffset={`${2 * Math.PI * 52 * (1 - savingsPercent / 100)}`}
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div className={styles.ringLabel}>
                <span className={styles.ringPercent}>{savingsPercent}%</span>
                <span className={styles.ringText}>de tu ingreso</span>
              </div>
            </div>

            {/* Savings cards */}
            <div className={styles.savingsCards}>
              <div className={styles.savingsCard}>
                <span className={styles.savingsCardLabel}>💵 Ahorro UYU</span>
                <span className={styles.savingsCardAmount}>${savingsUYU.toLocaleString('es-UY')}</span>
              </div>
              <div className={styles.savingsCard}>
                <span className={styles.savingsCardLabel}>💵 Ahorro USD</span>
                <span className={styles.savingsCardAmount}>U$S {savingsUSD.toLocaleString('es-UY')}</span>
              </div>
            </div>

            {/* Yearly tip */}
            {(yearlyUYU > 0 || yearlyUSD > 0) && (
              <div className={styles.tipCard}>
                <span className={styles.tipIcon}>💡</span>
                <span className={styles.tipText}>
                  En 1 año ahorrás: ${yearlyUYU.toLocaleString('es-UY')} UYU + U$S {yearlyUSD.toLocaleString('es-UY')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className={styles.navRow}>
          {step > 0 ? (
            <button type="button" className={styles.backBtn} onClick={() => setStep(s => s - 1)}>
              ← Atrás
            </button>
          ) : (
            <div />
          )}
          {step < totalSteps - 1 ? (
            <button
              type="button"
              className={styles.continueBtn}
              disabled={!canContinue}
              onClick={() => void handleContinue()}
            >
              Continuar →
            </button>
          ) : (
            <button
              type="button"
              className={styles.finishBtn}
              onClick={handleFinish}
            >
              ¡Empezar a ahorrar! 🚀
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
