// src/pages/ProductDetailPage.tsx

import React, { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProduct, useUpdateProduct, useDeleteProduct } from '@/features/products/hooks/useProducts'
import { usePriceHistory, usePriceByPlace, useAddPriceRecord, useUpdatePriceRecord } from '@/features/products/hooks/usePriceHistory'
import { useProductCategories } from '@/features/products/hooks/useProductCategories'
import { useBrands } from '@/features/products/hooks/useBrands'
import { usePlaces } from '@/features/places/hooks/usePlaces'
import { ProductForm } from '@/features/products/components/ProductForm'
import { PriceByPlaceTable } from '@/features/products/components/PriceByPlaceTable'
import { PriceHistoryChart, PLACE_COLORS } from '@/features/products/components/PriceHistoryChart'
import { NewPlaceModal } from '@/features/expenses/components/NewPlaceModal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Button } from '@/components/ui/Button'
import { SelectInput, FormField } from '@/components/ui/FormField'
import { PeriodControl } from '@/components/ui/PeriodControl'
import { Formik, Form, useField } from 'formik'
import * as Yup from 'yup'
import type { ProductFormValues } from '@/features/products/schemas/productSchema'
import type { ProductPriceRecord } from '@/types/models'
import { Currency } from '@/types/enums'
import styles from './ProductDetailPage.module.css'

// ─── Add-price mini-form ───────────────────────────────────

interface AddPriceValues {
  currency: Currency
  unitPrice: number | undefined
  placeId: string | undefined
}

const priceAmountSchema = Yup.object({
  currency: Yup.mixed<Currency>().oneOf(Object.values(Currency)).required(),
  unitPrice: Yup.number()
    .transform((v, orig) => (orig === '' ? undefined : v))
    .required('El precio es requerido')
    .min(0.01, 'Debe ser mayor a 0'),
})

const addPriceSchema = priceAmountSchema.shape({
  placeId: Yup.string().required('El local es requerido'),
})
const editPriceSchema = priceAmountSchema

function CurrencyField(): React.ReactElement {
  const [field, , helpers] = useField<Currency>('currency')
  return (
    <div className={styles.currencyToggle} role="group" aria-label="Moneda">
      {([Currency.UYU, Currency.USD] as Currency[]).map((cur) => (
        <button
          key={cur}
          type="button"
          className={[styles.currencyBtn, field.value === cur ? styles.currencyBtnActive : ''].join(' ')}
          onClick={() => void helpers.setValue(cur)}
        >
          {cur === Currency.USD ? 'U$S' : '$'}
        </button>
      ))}
    </div>
  )
}

function PriceField(): React.ReactElement {
  const [field, meta] = useField('unitPrice')
  const hasError = Boolean(meta.touched && meta.error)
  return (
    <div>
      <input
        {...field}
        type="number"
        inputMode="decimal"
        placeholder="0.00"
        className={[styles.priceInput, hasError ? styles.priceInputError : ''].join(' ')}
        aria-label="Precio"
        value={field.value ?? ''}
        onChange={(e) => {
          const val = e.target.value
          void field.onChange({ target: { name: field.name, value: val === '' ? undefined : parseFloat(val) } })
        }}
      />
      {hasError && <p className={styles.fieldError}>{meta.error}</p>}
    </div>
  )
}

// ─── Chart period options ──────────────────────────────────

const CHART_PERIOD_OPTIONS = [
  { value: '7d',  label: '7d' },
  { value: '1m',  label: '1m' },
  { value: '3m',  label: '3m' },
  { value: 'all', label: 'Todo' },
]

function filterByPeriod(records: ProductPriceRecord[], period: string): ProductPriceRecord[] {
  if (period === 'all') return records
  const now = new Date()
  const cutoff = new Date(now)
  if (period === '7d')  cutoff.setDate(now.getDate() - 7)
  if (period === '1m')  cutoff.setMonth(now.getMonth() - 1)
  if (period === '3m')  cutoff.setMonth(now.getMonth() - 3)
  const cutoffStr = cutoff.toISOString().split('T')[0]!
  return records.filter((r) => r.recordedAt >= cutoffStr)
}

// ─── Main page ─────────────────────────────────────────────

export default function ProductDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [addingPrice, setAddingPrice] = useState(false)
  const [showPlaceModal, setShowPlaceModal] = useState(false)
  const [editingRow, setEditingRow] = useState<{ placeId: string; placeName: string; unitPrice: number; currency: Currency } | null>(null)
  const [chartPeriod, setChartPeriod] = useState('3m')
  const [chartPlaceId, setChartPlaceId] = useState('')

  const { data: product, isLoading, error } = useProduct(id ?? '')
  const globalId = product?.globalProductId ?? ''
  const { data: priceHistory = [] } = usePriceHistory(globalId)
  const { data: priceByPlace = [] } = usePriceByPlace(globalId)
  const { data: categories = [] } = useProductCategories()
  const { data: brands = [] } = useBrands()
  const { data: places = [] } = usePlaces()

  const { mutateAsync: updateProduct } = useUpdateProduct(id ?? '')
  const { mutateAsync: deleteProduct } = useDeleteProduct()
  const { mutateAsync: addPriceRecord } = useAddPriceRecord()
  const { mutateAsync: updatePriceRecord } = useUpdatePriceRecord()

  // ── Chart data: filter by period + place ──────────────────
  const chartRecords = useMemo(() => {
    let filtered = filterByPeriod(priceHistory, chartPeriod)
    if (chartPlaceId) filtered = filtered.filter((r) => r.placeId === chartPlaceId)
    return filtered
  }, [priceHistory, chartPeriod, chartPlaceId])

  // ── Place color mapping (order of first appearance) ───────
  const placeIdsInOrder = useMemo(() => {
    const seen = new Set<string>()
    const result: string[] = []
    for (const r of [...priceHistory].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))) {
      if (!seen.has(r.placeId)) { seen.add(r.placeId); result.push(r.placeId) }
    }
    return result
  }, [priceHistory])

  const placeNames = Object.fromEntries(places.map((p) => [p.id, p.name]))

  // ── Stats from full history ────────────────────────────────
  const chartStats = useMemo(() => {
    const prices = chartRecords.map((r) => r.unitPrice)
    if (prices.length === 0) return null
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length
    const sorted = [...chartRecords].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    const first = sorted[0]!.unitPrice
    const last = sorted[sorted.length - 1]!.unitPrice
    const trendPct = first > 0 ? Math.round(((last - first) / first) * 100) : 0
    const currency = chartRecords[0]!.currency === Currency.USD ? 'U$S' : '$'
    return { min, max, avg, trendPct, currency }
  }, [chartRecords])

  if (isLoading) return <LoadingSpinner fullPage />
  if (error || !product) return <ErrorMessage message="No se pudo cargar el producto." />

  const category = categories.find((c) => c.id === product.productCategoryId)
  const brand = product.brandId ? brands.find((b) => b.id === product.brandId) : undefined

  const bestPrice = priceByPlace.length > 0
    ? priceByPlace.reduce((a, b) => a.unitPrice <= b.unitPrice ? a : b)
    : null
  const currSymbol = bestPrice?.currency === Currency.USD ? 'U$S' : '$'

  async function handleUpdate(values: ProductFormValues): Promise<void> {
    await updateProduct({ name: values.name, productCategoryId: values.productCategoryId })
    setEditing(false)
  }

  async function handleAddPrice(values: AddPriceValues): Promise<void> {
    if (!values.unitPrice || !values.placeId) return
    await addPriceRecord({
      productId: globalId,
      placeId: values.placeId,
      unitPrice: values.unitPrice,
      currency: values.currency,
      recordedAt: new Date().toISOString().split('T')[0] as string,
    })
    setAddingPrice(false)
  }

  async function handleEditPrice(values: AddPriceValues): Promise<void> {
    if (!values.unitPrice || !values.placeId) return
    const latestRecord = priceHistory
      .filter((r) => r.placeId === values.placeId)
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0]
    if (!latestRecord) return
    await updatePriceRecord({
      id: latestRecord.id,
      unitPrice: values.unitPrice,
      currency: values.currency,
      productId: globalId,
      placeId: values.placeId,
    })
    setEditingRow(null)
  }

  async function handleDelete(): Promise<void> {
    if (!window.confirm('¿Eliminar este producto?')) return
    await deleteProduct(product!.id)
    navigate('/settings/products')
  }

  return (
    <div className={styles.page}>

      {/* ═══ MOBILE header ═══════════════════════════════════ */}
      <header className={styles.mobileHeader}>
        <div className={styles.headerTop}>
          {!editing && (
            <button className={styles.editBtn} onClick={() => setEditing(true)}>✏️ Editar</button>
          )}
        </div>
        <div className={styles.iconWrap} aria-hidden>{category?.icon ?? '📦'}</div>
        <h1 className={styles.name}>{product.name}</h1>
        <div className={styles.badges}>
          {category && <span className={styles.badge}>{category.name}</span>}
          {brand && <span className={styles.badge}>{brand.name}</span>}
        </div>
      </header>

      {/* ═══ DESKTOP header ══════════════════════════════════ */}
      <header className={styles.desktopHeader}>
        {/* Title row: icon + name + price + edit btn */}
        <div className={styles.dtTitleRow}>
          <div className={styles.dtTitleLeft}>
            <span className={styles.dtIcon} aria-hidden>{category?.icon ?? '📦'}</span>
            <div>
              <div className={styles.dtNamePriceRow}>
                <h1 className={styles.dtName}>{product.name}</h1>
                {bestPrice && (
                  <span className={styles.dtPrice}>
                    {currSymbol} {bestPrice.unitPrice.toLocaleString('es-UY', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
              <div className={styles.dtBadges}>
                {category && (
                  <span className={styles.dtBadge} style={{ background: `${category.color}22`, color: category.color, borderColor: `${category.color}55` }}>
                    {category.icon} {category.name}
                  </span>
                )}
                {brand && <span className={styles.dtBadge}>{brand.name}</span>}
              </div>
            </div>
          </div>
          {!editing && (
            <button className={styles.dtEditBtn} onClick={() => setEditing(true)}>
              ✏️ Editar
            </button>
          )}
        </div>
      </header>

      {/* ═══ Body ════════════════════════════════════════════ */}
      <div className={styles.body}>

        {/* Edit form */}
        {editing && (
          <section className={styles.section}>
            <ProductForm
              initialValues={{
                name: product.name,
                pricingType: product.pricingType,
                weightUnit: product.weightUnit,
                productCategoryId: product.productCategoryId,
                brandId: product.brandId,
                globalProductId: product.globalProductId,
              }}
              onSubmit={handleUpdate}
              submitLabel="Guardar cambios"
              onCancel={() => setEditing(false)}
              editMode
            />
          </section>
        )}

        {/* ── Price history chart — shown first ─────────────── */}
        {priceHistory.length > 0 && (
          <section className={styles.section}>
            {/* Section header with filters */}
            <div className={styles.chartHeader}>
              <h2 className={styles.sectionTitle}>📈 Evolución del precio</h2>
              <div className={styles.chartControls}>
                {/* Place filter */}
                <div className={styles.chartPlaceWrap}>
                  <select
                    className={styles.chartPlaceSelect}
                    value={chartPlaceId}
                    onChange={(e) => setChartPlaceId(e.target.value)}
                  >
                    <option value="">Todos los locales</option>
                    {placeIdsInOrder.map((pid) => (
                      <option key={pid} value={pid}>{placeNames[pid] ?? pid}</option>
                    ))}
                  </select>
                </div>
                {/* Period pills */}
                <PeriodControl
                  value={chartPeriod}
                  onChange={setChartPeriod}
                  options={CHART_PERIOD_OPTIONS}
                />
              </div>
            </div>

            {/* Chart */}
            <div className={styles.chartWrap}>
              {chartRecords.length >= 2 ? (
                <PriceHistoryChart
                  records={chartRecords}
                  placeNames={placeNames}
                  hideLegend
                />
              ) : (
                <p className={styles.chartEmpty}>
                  {chartRecords.length === 0
                    ? 'Sin registros en este período.'
                    : 'Necesitás al menos 2 registros para ver la evolución.'}
                </p>
              )}
            </div>

            {/* Stats + legend row (outside chart) */}
            <div className={styles.chartMeta}>
              {/* Stats */}
              {chartStats && (
                <div className={styles.chartStats}>
                  <div className={styles.chartStat}>
                    <span className={styles.chartStatLabel}>Mínimo</span>
                    <span className={[styles.chartStatValue, styles.chartStatMin].join(' ')}>
                      {chartStats.currency} {chartStats.min.toLocaleString('es-UY')}
                    </span>
                  </div>
                  <div className={styles.chartStat}>
                    <span className={styles.chartStatLabel}>Máximo</span>
                    <span className={[styles.chartStatValue, styles.chartStatMax].join(' ')}>
                      {chartStats.currency} {chartStats.max.toLocaleString('es-UY')}
                    </span>
                  </div>
                  <div className={styles.chartStat}>
                    <span className={styles.chartStatLabel}>Promedio</span>
                    <span className={styles.chartStatValue}>
                      {chartStats.currency} {chartStats.avg.toLocaleString('es-UY', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className={styles.chartStat}>
                    <span className={styles.chartStatLabel}>Tendencia</span>
                    <span className={[
                      styles.chartStatValue,
                      styles.chartStatTrend,
                      chartStats.trendPct > 0 ? styles.chartStatTrendUp : chartStats.trendPct < 0 ? styles.chartStatTrendDown : styles.chartStatTrendFlat,
                    ].join(' ')}>
                      {chartStats.trendPct > 0 ? `▲ +${chartStats.trendPct}%` : chartStats.trendPct < 0 ? `▼ ${chartStats.trendPct}%` : '→ Estable'}
                    </span>
                  </div>
                </div>
              )}

              {/* Place legend */}
              {!chartPlaceId && placeIdsInOrder.length > 1 && (
                <div className={styles.chartLegend}>
                  {placeIdsInOrder.map((pid, idx) => (
                    <button
                      key={pid}
                      className={[styles.chartLegendItem, chartPlaceId === pid ? styles.chartLegendItemActive : ''].join(' ')}
                      onClick={() => setChartPlaceId(chartPlaceId === pid ? '' : pid)}
                    >
                      <span
                        className={styles.chartLegendDot}
                        style={{ background: PLACE_COLORS[idx % PLACE_COLORS.length] }}
                      />
                      {placeNames[pid] ?? pid}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Price by place ────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>🏪 Comparativa por local</h2>
            {!addingPrice && !editingRow && (
              <button className={styles.addPriceBtn} onClick={() => setAddingPrice(true)}>
                ＋ Agregar precio
              </button>
            )}
          </div>

          {addingPrice && (() => {
            const usedPlaceIds = new Set(priceByPlace.map((r) => r.placeId))
            const availablePlaces = places.filter((p) => !usedPlaceIds.has(p.id))
            return (
              <Formik<AddPriceValues>
                initialValues={{ currency: Currency.UYU, unitPrice: undefined, placeId: undefined }}
                validationSchema={addPriceSchema}
                onSubmit={handleAddPrice}
              >
                {({ isSubmitting, setFieldValue }) => (
                  <Form className={styles.addPriceForm}>
                    <div className={styles.addPriceRow}>
                      <CurrencyField />
                      <div className={styles.addPricePriceWrap}>
                        <PriceField />
                      </div>
                    </div>
                    <div className={styles.addPricePlaceWrap}>
                      <FormField name="placeId" label="Local">
                        <SelectInput
                          name="placeId"
                          options={availablePlaces.map((p) => ({ value: p.id, label: p.name }))}
                          placeholder="Seleccioná un local"
                          icon="📍"
                        />
                      </FormField>
                      <p className={styles.addPricePlaceHint}>
                        ¿No encontrás el local?{' '}
                        <button type="button" className={styles.addPricePlaceLink} onClick={() => setShowPlaceModal(true)}>
                          Crear nuevo
                        </button>
                      </p>
                    </div>
                    <div className={styles.addPriceActions}>
                      <Button type="button" variant="ghost" onClick={() => setAddingPrice(false)}>Cancelar</Button>
                      <Button type="submit" loading={isSubmitting}>Registrar precio</Button>
                    </div>
                    {showPlaceModal && (
                      <NewPlaceModal
                        onClose={() => setShowPlaceModal(false)}
                        onCreated={(place) => { void setFieldValue('placeId', place.id); setShowPlaceModal(false) }}
                      />
                    )}
                  </Form>
                )}
              </Formik>
            )
          })()}

          {editingRow && (
            <Formik<AddPriceValues>
              initialValues={{ currency: editingRow.currency, unitPrice: editingRow.unitPrice, placeId: editingRow.placeId }}
              validationSchema={editPriceSchema}
              onSubmit={handleEditPrice}
            >
              {({ isSubmitting }) => (
                <Form className={styles.addPriceForm}>
                  <p className={styles.editPriceLabel}>Actualizar precio en <strong>{editingRow.placeName}</strong></p>
                  <div className={styles.addPriceRow}>
                    <CurrencyField />
                    <div className={styles.addPricePriceWrap}>
                      <PriceField />
                    </div>
                  </div>
                  <div className={styles.addPriceActions}>
                    <Button type="button" variant="ghost" onClick={() => setEditingRow(null)}>Cancelar</Button>
                    <Button type="submit" loading={isSubmitting}>Guardar precio</Button>
                  </div>
                </Form>
              )}
            </Formik>
          )}

          <PriceByPlaceTable
            rows={priceByPlace}
            onEdit={(row) => setEditingRow({ placeId: row.placeId, placeName: row.placeName, unitPrice: row.unitPrice, currency: row.currency })}
          />
        </section>

        {/* Delete */}
        <div className={styles.deleteWrap}>
          <Button variant="danger" fullWidth onClick={() => void handleDelete()}>
            Eliminar producto
          </Button>
        </div>
      </div>
    </div>
  )
}
