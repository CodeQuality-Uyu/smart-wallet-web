// src/pages/ProductCategoriesPage.tsx

import React, { useState, useMemo } from 'react'
import { Formik, Form } from 'formik'
import {
  useProductCategories,
  useCreateProductCategory,
  useUpdateProductCategory,
  useDeleteProductCategory,
} from '@/features/products/hooks/useProductCategories'
import { useProducts } from '@/features/products/hooks/useProducts'
import { useMetrics } from '@/hooks/useMetrics'
import { useProductCategoryLimits, useSetProductCategoryLimits } from '@/hooks/useProductCategoryLimits'
import { productCategorySchema, type ProductCategoryFormValues } from '@/features/products/schemas/productCategorySchema'
import { FormField, TextInput } from '@/components/ui/FormField'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PeriodControl } from '@/components/ui/PeriodControl'
import { formatCurrency } from '@/utils/formatCurrency'
import { PeriodFilter, Currency } from '@/types/enums'
import type { ProductCategory } from '@/types/models'
import styles from './ProductCategoriesPage.module.css'

const ICON_OPTIONS = [
  '🛒','🥛','🥦','🍎','🍞','🥩','🐟','🧃','🫙','🍫','🧴','🧹',
  '💊','🐾','📦','🍳','🧀','🥚','🍗','🌽','🥕','🍋','🧆','🥜',
]

const COLOR_OPTIONS = [
  '#ef4444','#f97316','#f5b732','#10b981','#3b82f6','#8b5cf6',
  '#ec4899','#6b7280','#14b8a6','#84cc16','#f43f5e','#a855f7',
  '#0ea5e9','#fb923c','#22c55e','#64748b','#e11d48','#7c3aed',
  '#0d9488','#ca8a04','#1d4ed8','#be185d','#15803d','#374151',
]

export default function ProductCategoriesPage(): React.ReactElement {
  const { data: categories = [], isLoading } = useProductCategories()
  const { data: products = [] } = useProducts()
  const { mutateAsync: createCat } = useCreateProductCategory()
  const { mutateAsync: deleteCat } = useDeleteProductCategory()
  const [editing, setEditing] = useState<ProductCategory | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [period, setPeriod] = useState(PeriodFilter.Month)
  const [search, setSearch] = useState('')
  const { mutateAsync: updateCat } = useUpdateProductCategory(editing?.id ?? '')
  const { data: metrics } = useMetrics(period)
  const { data: categoryLimits = {} } = useProductCategoryLimits()
  const { mutateAsync: setLimits } = useSetProductCategoryLimits()

  // Count products per category
  const countMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of products) {
      if (p.active) {
        map.set(p.productCategoryId, (map.get(p.productCategoryId) ?? 0) + 1)
      }
    }
    return map
  }, [products])

  // Spending per product category from metrics
  const spendMap = useMemo(() => {
    const map = new Map<string, { usd: number; uyu: number }>()
    for (const c of metrics?.byProductCategory ?? []) {
      map.set(c.productCategoryId, { usd: c.usd, uyu: c.uyu })
    }
    return map
  }, [metrics])

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories
    const q = search.toLowerCase()
    return categories.filter((c) => c.name.toLowerCase().includes(q))
  }, [categories, search])

  // Most used category (by product count)
  const mostUsed = useMemo(() => {
    let best: ProductCategory | null = null
    let bestCount = 0
    for (const cat of categories) {
      const count = countMap.get(cat.id) ?? 0
      if (count > bestCount) { bestCount = count; best = cat }
    }
    return best
  }, [categories, countMap])

  const catsWithProducts = useMemo(
    () => categories.filter((c) => (countMap.get(c.id) ?? 0) > 0).length,
    [categories, countMap],
  )

  if (isLoading) return <LoadingSpinner fullPage />

  async function handleSubmit(
    values: ProductCategoryFormValues,
    { setStatus }: { setStatus: (s: string) => void },
  ): Promise<void> {
    const nameLower = values.name.trim().toLowerCase()
    const duplicate = categories.find(
      (c) => c.name.toLowerCase() === nameLower && c.id !== editing?.id,
    )
    if (duplicate) {
      setStatus(`Ya existe una categoría llamada "${duplicate.name}"`)
      return
    }
    try {
      const catId = editing
        ? (await updateCat(values), editing.id)
        : (await createCat(values)).id
      const prev = categoryLimits[catId] ?? {}
      await setLimits({
        ...categoryLimits,
        [catId]: {
          ...prev,
          [Currency.UYU]: values.limitUYU ?? undefined,
          [Currency.USD]: values.limitUSD ?? undefined,
        },
      })
      setShowForm(false)
      setEditing(null)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  function startEdit(cat: ProductCategory): void {
    setEditing(cat)
    setShowForm(true)
  }

  const initialValues: ProductCategoryFormValues = {
    name: editing?.name ?? '',
    icon: editing?.icon ?? '',
    color: editing?.color ?? '',
    limitUYU: editing ? (categoryLimits[editing.id]?.[Currency.UYU] ?? undefined) : undefined,
    limitUSD: editing ? (categoryLimits[editing.id]?.[Currency.USD] ?? undefined) : undefined,
  }

  const periodControl = <PeriodControl value={period} onChange={setPeriod} />

  return (
    <div>
      <PageHeader
        title="Categorías de productos"
        subtitle="Organizá tus productos en categorías para encontrarlos más fácil"
        rightAction={
          <button
            className={styles.newBtn}
            onClick={() => { setEditing(null); setShowForm(true) }}
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
            <span className={styles.statValue}>{mostUsed?.icon ?? '—'}</span>
            <span className={styles.statSub}>{mostUsed?.name ?? 'Sin datos'}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Con productos</span>
            <span className={styles.statValue}>{catsWithProducts}</span>
            <span className={styles.statSub}>de {categories.length}</span>
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
            <h2 className={styles.formTitle}>
              {editing ? 'Editar categoría' : 'Nueva categoría'}
            </h2>
            <Formik
              initialValues={initialValues}
              validationSchema={productCategorySchema}
              onSubmit={handleSubmit}
              enableReinitialize
            >
              {({ isSubmitting, values, setFieldValue, status }) => (
                <Form>
                  {/* Ícono + Color en fila */}
                  <div className={styles.formPickersRow}>
                    <div className={styles.formPickerGroup}>
                      <p className={styles.formPickerLabel}>Ícono</p>
                      <div className={styles.iconPicker} role="group" aria-label="Seleccionar ícono">
                        {ICON_OPTIONS.map((ico) => (
                          <button
                            key={ico}
                            type="button"
                            className={[styles.icoBtn, values.icon === ico ? styles.icoBtnActive : ''].join(' ')}
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
                      <div className={styles.colorPicker} role="group" aria-label="Seleccionar color">
                        {COLOR_OPTIONS.map((col) => (
                          <button
                            key={col}
                            type="button"
                            className={[styles.colorBtn, values.color === col ? styles.colorBtnActive : ''].join(' ')}
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
                    <TextInput name="name" placeholder="ej. Lácteos" />
                  </FormField>

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
                      onClick={() => { setShowForm(false); setEditing(null) }}
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
            const count = countMap.get(cat.id) ?? 0
            const spend = spendMap.get(cat.id)
            return (
              <div key={cat.id} className={styles.tile} style={cat.color ? { borderColor: cat.color } : undefined}>
                <div className={styles.tileIconWrap}>
                  <span className={styles.tileIcon}>{cat.icon}</span>
                </div>
                <div className={styles.tileInfo}>
                  <span className={styles.tileName}>{cat.name}</span>
                  {count > 0 ? (
                    <div className={styles.tileSpend}>
                      <span>{count} producto{count !== 1 ? 's' : ''}</span>
                      {spend && (spend.uyu > 0 || spend.usd > 0) && <span>·</span>}
                      {spend?.uyu && spend.uyu > 0 ? (
                        <span className={styles.tileSpendAmount}>
                          {formatCurrency(spend.uyu, Currency.UYU)}
                        </span>
                      ) : null}
                      {spend?.uyu && spend.uyu > 0 && spend?.usd && spend.usd > 0 ? <span>·</span> : null}
                      {spend?.usd && spend.usd > 0 ? (
                        <span className={styles.tileSpendAmount}>
                          {formatCurrency(spend.usd, Currency.USD)}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className={styles.tileEmpty}>Sin productos</span>
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

        {/* Limits section */}
        {(() => {
          const configuredIds = Object.keys(categoryLimits).filter((id) => {
            const e = categoryLimits[id]
            return (e?.[Currency.UYU] ?? 0) > 0 || (e?.[Currency.USD] ?? 0) > 0
          })
          const configuredCount = configuredIds.length
          const catsWithLimit = (metrics?.byProductCategory ?? []).filter((c) =>
            configuredIds.includes(c.productCategoryId),
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
                    Tocá ✏ en cualquier categoría para configurar un límite mensual.
                  </p>
                </div>
              )}
              {catsWithLimit.map((c, idx) => {
                const entry = categoryLimits[c.productCategoryId] ?? {}
                const totalCats = catsWithLimit.length
                const colorPct = idx / (totalCats - 1 || 1)
                const color = colorPct < 0.33 ? '#10b981' : colorPct < 0.66 ? '#f5b732' : '#ef4444'
                const limitUyu = entry[Currency.UYU] ?? 0
                const limitUsd = entry[Currency.USD] ?? 0
                const pctUyu = limitUyu > 0 ? Math.min(Math.round((c.uyu / limitUyu) * 100), 100) : 0
                const pctUsd = limitUsd > 0 ? Math.min(Math.round((c.usd / limitUsd) * 100), 100) : 0
                return (
                  <div key={c.productCategoryId} className={styles.limitRow}>
                    <span className={styles.limitIcon}>{c.productCategoryIcon}</span>
                    <div className={styles.limitInfo}>
                      <span className={styles.limitName}>{c.productCategoryName}</span>
                      {limitUyu > 0 && (
                        <>
                          <div className={styles.limitTopRow}>
                            <span className={styles.limitAmt}>
                              UYU: {formatCurrency(c.uyu, Currency.UYU)} / {formatCurrency(limitUyu, Currency.UYU)}
                            </span>
                            <span className={styles.limitPct} style={{ color }}>{pctUyu}%</span>
                          </div>
                          <div className={styles.limitBarTrack}>
                            <div className={styles.limitBarFill} style={{ width: `${pctUyu}%`, background: color }} />
                          </div>
                        </>
                      )}
                      {limitUsd > 0 && (
                        <>
                          <div className={styles.limitTopRow}>
                            <span className={styles.limitAmt}>
                              USD: {formatCurrency(c.usd, Currency.USD)} / {formatCurrency(limitUsd, Currency.USD)}
                            </span>
                            <span className={styles.limitPct} style={{ color }}>{pctUsd}%</span>
                          </div>
                          <div className={styles.limitBarTrack}>
                            <div className={styles.limitBarFill} style={{ width: `${pctUsd}%`, background: color }} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
              {configuredCount > 0 && catsWithLimit.length === 0 && (
                <p className={styles.limitsEmpty}>
                  Sin gastos en las categorías configuradas para este período.
                </p>
              )}
            </div>
          )
        })()}

        {/* Mobile add button */}
        <button
          className={styles.addBtn}
          onClick={() => { setEditing(null); setShowForm(true) }}
        >
          ＋ Agregar categoría
        </button>
      </div>
    </div>
  )
}
