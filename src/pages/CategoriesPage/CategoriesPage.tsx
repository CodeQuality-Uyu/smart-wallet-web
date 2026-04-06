// src/pages/CategoriesPage.tsx

import React, { useState, useMemo } from 'react'
import { Formik, Form } from 'formik'
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/features/categories/hooks/useCategories'
import {
  categorySchema,
  type CategoryFormValues,
} from '@/features/categories/schemas/categorySchema'
import { FormField, TextInput } from '@/components/ui/FormField'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PeriodControl } from '@/components/ui/PeriodControl'
import { useMetrics } from '@/hooks/useMetrics'
import { formatCurrency } from '@/utils/formatCurrency'
import { PeriodFilter, Currency } from '@/types/enums'
import type { Category } from '@/types/models'
import styles from './CategoriesPage.module.css'

const ICON_OPTIONS = [
  '🍔',
  '🚌',
  '🏠',
  '💊',
  '🎬',
  '☕',
  '✈️',
  '🎓',
  '🛒',
  '💄',
  '🐾',
  '🎮',
  '⚡',
  '🛠',
  '📚',
  '🎵',
  '🏖',
  '🍕',
  '🐶',
  '🧘',
  '💻',
  '🎁',
  '🔧',
  '🧾',
]

const COLOR_OPTIONS = [
  '#ef4444',
  '#f97316',
  '#f5b732',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#6b7280',
  '#14b8a6',
  '#84cc16',
  '#f43f5e',
  '#a855f7',
  '#0ea5e9',
  '#fb923c',
  '#22c55e',
  '#64748b',
  '#e11d48',
  '#7c3aed',
  '#0d9488',
  '#ca8a04',
  '#1d4ed8',
  '#be185d',
  '#15803d',
  '#374151',
]

export default function CategoriesPage(): React.ReactElement {
  const { data: categories = [], isLoading } = useCategories()
  const { mutateAsync: createCat } = useCreateCategory()
  const { mutateAsync: deleteCat } = useDeleteCategory()

  const [editing, setEditing] = useState<Category | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [period, setPeriod] = useState(PeriodFilter.Month)
  const [search, setSearch] = useState('')
  const { mutateAsync: updateCat } = useUpdateCategory(editing?.id ?? '')
  const { data: metrics } = useMetrics(period)

  const spendMap = useMemo(() => {
    const map = new Map<string, { usd: number; uyu: number; expenseCount: number }>()
    for (const c of metrics?.byCategory ?? []) {
      map.set(c.categoryId, { usd: c.usd, uyu: c.uyu, expenseCount: c.expenseCount })
    }
    return map
  }, [metrics])

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories
    const q = search.toLowerCase()
    return categories.filter((c) => c.name.toLowerCase().includes(q))
  }, [categories, search])

  if (isLoading) return <LoadingSpinner fullPage />

  async function handleSubmit(
    values: CategoryFormValues,
    { setStatus }: { setStatus: (status: string) => void }
  ): Promise<void> {
    try {
      const payload = {
        name: values.name,
        icon: values.icon,
        color: values.color,
        limitUYU: values.limitUYU && values.limitUYU > 0 ? values.limitUYU : undefined,
        limitUSD: values.limitUSD && values.limitUSD > 0 ? values.limitUSD : undefined,
      }
      if (editing) {
        await updateCat(payload)
      } else {
        await createCat({ ...payload, active: true })
      }
      setShowForm(false)
      setEditing(null)
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : ((err as { message?: string })?.message ?? 'Error al guardar')
      setStatus(msg)
    }
  }

  function startEdit(cat: Category): void {
    setEditing(cat)
    setShowForm(true)
  }

  const initialValues: CategoryFormValues = {
    name: editing?.name ?? '',
    icon: editing?.icon ?? '',
    color: editing?.color ?? '',
    limitUYU: editing?.limitUYU ?? undefined,
    limitUSD: editing?.limitUSD ?? undefined,
  }

  const periodControl = <PeriodControl value={period} onChange={setPeriod} />

  return (
    <div>
      <PageHeader
        title="Categorías"
        subtitle="Organizá tus gastos en categorías para entender mejor tus hábitos financieros"
        rightAction={
          <button
            className={styles.newBtn}
            onClick={() => {
              setEditing(null)
              setShowForm(true)
            }}
          >
            + Nueva categoría
          </button>
        }
      />

      <div className={styles.body}>
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total categorías</span>
            <span className={styles.statValue}>{categories.length}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Más usada</span>
            <span className={styles.statValue}>{metrics?.byCategory[0]?.categoryIcon ?? '—'}</span>
            <span className={styles.statSub}>
              {metrics?.byCategory[0]?.categoryName ?? 'Sin datos'}
            </span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Con gastos</span>
            <span className={styles.statValue}>{metrics?.byCategory.length ?? 0}</span>
            <span className={styles.statSub}>en el período</span>
          </div>
        </div>

        {/* Search + period filter */}
        <div className={styles.searchRow}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Buscar categoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className={styles.searchClear} onClick={() => setSearch('')}>
                ✕
              </button>
            )}
          </div>
          {periodControl}
        </div>

        {/* Inline edit/create form */}
        {showForm && (
          <div className={styles.form}>
            <h2 className={styles.formTitle}>{editing ? 'Editar categoría' : 'Nueva categoría'}</h2>
            <Formik
              initialValues={initialValues}
              validationSchema={categorySchema}
              onSubmit={handleSubmit}
              enableReinitialize
            >
              {({ isSubmitting, values, setFieldValue, status }) => (
                <Form>
                  {/* Ícono + Color en fila */}
                  <div className={styles.formPickersRow}>
                    <div className={styles.formPickerGroup}>
                      <p className={styles.formPickerLabel}>Ícono</p>
                      <div
                        className={styles.iconPicker}
                        role="group"
                        aria-label="Seleccionar ícono"
                      >
                        {ICON_OPTIONS.map((ico) => (
                          <button
                            key={ico}
                            type="button"
                            className={[
                              styles.icoBtn,
                              values.icon === ico ? styles.icoBtnActive : '',
                            ].join(' ')}
                            onClick={() => void setFieldValue('icon', ico)}
                            aria-label={ico}
                            aria-pressed={values.icon === ico}
                          >
                            {ico}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={styles.formPickerGroup}>
                      <p className={styles.formPickerLabel}>Color</p>
                      <div
                        className={styles.colorPicker}
                        role="group"
                        aria-label="Seleccionar color"
                      >
                        {COLOR_OPTIONS.map((col) => (
                          <button
                            key={col}
                            type="button"
                            className={[
                              styles.colorBtn,
                              values.color === col ? styles.colorBtnActive : '',
                            ].join(' ')}
                            style={{ background: col, '--swatch-color': col } as React.CSSProperties}
                            onClick={() => void setFieldValue('color', col)}
                            aria-label={col}
                            aria-pressed={values.color === col}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Nombre */}
                  <FormField name="name" label="Nombre">
                    <TextInput name="name" placeholder="ej. Comida" />
                  </FormField>

                  {/* Límites */}
                  <FormField name="limitUYU" label="Límite UYU">
                    <TextInput name="limitUYU" type="number" min={0} placeholder="Sin límite" />
                  </FormField>
                  <FormField name="limitUSD" label="Límite USD">
                    <TextInput name="limitUSD" type="number" min={0} placeholder="Sin límite" />
                  </FormField>

                  {status && <p className={styles.formError}>{status}</p>}

                  <div className={styles.formActions}>
                    <button
                      type="button"
                      className={styles.formCancelBtn}
                      onClick={() => {
                        setShowForm(false)
                        setEditing(null)
                      }}
                    >
                      Cancelar
                    </button>
                    <button type="submit" className={styles.formSaveBtn} disabled={isSubmitting}>
                      {isSubmitting ? 'Guardando…' : editing ? 'Guardar' : 'Crear categoría'}
                    </button>
                  </div>
                  {editing && (
                    <button
                      type="button"
                      className={styles.formDeleteBtn}
                      onClick={async () => {
                        if (!window.confirm(`¿Eliminar la categoría "${editing.name}"?`)) return
                        await deleteCat(editing.id)
                        setShowForm(false)
                        setEditing(null)
                      }}
                    >
                      Eliminar categoría
                    </button>
                  )}
                </Form>
              )}
            </Formik>
          </div>
        )}

        <p className={styles.sectionLabel}>Tus categorías</p>

        <div className={styles.grid}>
          {filteredCategories.map((cat) => {
            const spend = spendMap.get(cat.id)
            return (
              <div key={cat.id} className={styles.tile} style={cat.color ? { borderColor: cat.color } : undefined}>
                <div className={styles.tileIconWrap}>
                  <span className={styles.tileIcon}>{cat.icon}</span>
                </div>
                <div className={styles.tileInfo}>
                  <span className={styles.tileName}>{cat.name}</span>
                  {spend ? (
                    <div className={styles.tileSpend}>
                      <span>
                        {spend.expenseCount} gasto{spend.expenseCount !== 1 ? 's' : ''}
                      </span>
                      {(spend.uyu > 0 || spend.usd > 0) && <span>·</span>}
                      {spend.uyu > 0 && (
                        <span className={styles.tileSpendAmount}>
                          {formatCurrency(spend.uyu, Currency.UYU)}
                        </span>
                      )}
                      {spend.uyu > 0 && spend.usd > 0 && <span>·</span>}
                      {spend.usd > 0 && (
                        <span className={styles.tileSpendAmount}>
                          {formatCurrency(spend.usd, Currency.USD)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className={styles.tileEmpty}>Sin gastos</span>
                  )}
                </div>
                <button
                  className={styles.editBtn}
                  onClick={() => startEdit(cat)}
                  aria-label={`Editar ${cat.name}`}
                >
                  ✏
                </button>
              </div>
            )
          })}
          {filteredCategories.length === 0 && (
            <p className={styles.emptySearch}>No hay categorías que coincidan.</p>
          )}
        </div>

        {/* Límites por categoría */}
        {(() => {
          const byCategory = metrics?.byCategory ?? []
          const catsWithLimit = categories.filter((c) => (c.limitUYU ?? 0) > 0 || (c.limitUSD ?? 0) > 0)
          const configuredCount = catsWithLimit.length
          const spendingCatsWithLimit = byCategory.filter((c) =>
            catsWithLimit.some((cat) => cat.id === c.categoryId)
          )
          return (
            <div className={styles.limitsCard}>
              <div className={styles.limitsHeader}>
                <div className={styles.limitsTitleRow}>
                  <span>🎯</span>
                  <h3 className={styles.limitsTitle}>Límites por categoría</h3>
                </div>
                <span className={styles.limitsBadge}>
                  {configuredCount} de {categories.length} configurados
                </span>
              </div>
              {configuredCount === 0 && (
                <div className={styles.limitsEmptyState}>
                  <span className={styles.limitsEmptyIcon}>🎯</span>
                  <p className={styles.limitsEmptyTitle}>Sin límites configurados</p>
                  <p className={styles.limitsEmptyHint}>
                    Hacé click en ✏ de cualquier categoría para configurar tu primer límite mensual.
                  </p>
                </div>
              )}
              {spendingCatsWithLimit.map((c) => {
                const cat = catsWithLimit.find((cat) => cat.id === c.categoryId)!
                const limitUyu = cat.limitUYU ?? 0
                const limitUsd = cat.limitUSD ?? 0
                const spentUyu = c.uyu
                const spentUsd = c.usd
                const pctUyu =
                  limitUyu > 0 ? Math.min(Math.round((spentUyu / limitUyu) * 100), 100) : 0
                const pctUsd =
                  limitUsd > 0 ? Math.min(Math.round((spentUsd / limitUsd) * 100), 100) : 0
                const worstPct = Math.max(pctUyu, pctUsd)
                const color = worstPct < 66 ? '#10b981' : worstPct < 90 ? '#f5b732' : '#ef4444'
                return (
                  <div key={c.categoryId} className={styles.limitRow}>
                    <span className={styles.limitIcon}>{c.categoryIcon}</span>
                    <div className={styles.limitInfo}>
                      <span className={styles.limitName}>{c.categoryName}</span>
                      {limitUyu > 0 && (
                        <>
                          <div className={styles.limitTopRow}>
                            <span className={styles.limitAmt}>
                              UYU: {formatCurrency(spentUyu, Currency.UYU)} /{' '}
                              {formatCurrency(limitUyu, Currency.UYU)}
                            </span>
                            <span className={styles.limitPct} style={{ color }}>
                              {pctUyu}%
                            </span>
                          </div>
                          <div className={styles.limitBarTrack}>
                            <div
                              className={styles.limitBarFill}
                              style={{ width: `${pctUyu}%`, background: color }}
                            />
                          </div>
                        </>
                      )}
                      {limitUsd > 0 && (
                        <>
                          <div className={styles.limitTopRow}>
                            <span className={styles.limitAmt}>
                              USD: {formatCurrency(spentUsd, Currency.USD)} /{' '}
                              {formatCurrency(limitUsd, Currency.USD)}
                            </span>
                            <span className={styles.limitPct} style={{ color }}>
                              {pctUsd}%
                            </span>
                          </div>
                          <div className={styles.limitBarTrack}>
                            <div
                              className={styles.limitBarFill}
                              style={{ width: `${pctUsd}%`, background: color }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
              {configuredCount > 0 && spendingCatsWithLimit.length === 0 && (
                <p className={styles.limitsEmpty}>
                  Sin gastos en las categorías configuradas para este período.
                </p>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
