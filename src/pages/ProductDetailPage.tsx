// src/pages/ProductDetailPage.tsx

import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProduct, useUpdateProduct, useDeleteProduct } from '@/features/products/hooks/useProducts'
import { usePriceHistory, usePriceByPlace, useAddPriceRecord } from '@/features/products/hooks/usePriceHistory'
import { useProductCategories } from '@/features/products/hooks/useProductCategories'
import { useBrands } from '@/features/products/hooks/useBrands'
import { usePlaces } from '@/features/places/hooks/usePlaces'
import { ProductForm } from '@/features/products/components/ProductForm'
import { PriceByPlaceTable } from '@/features/products/components/PriceByPlaceTable'
import { PriceHistoryChart } from '@/features/products/components/PriceHistoryChart'
import { NewPlaceModal } from '@/features/expenses/components/NewPlaceModal'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Button } from '@/components/ui/Button'
import { SelectInput } from '@/components/ui/FormField'
import { Formik, Form, useField } from 'formik'
import * as Yup from 'yup'
import type { ProductFormValues } from '@/features/products/schemas/productSchema'
import { Currency } from '@/types/enums'
import styles from './ProductDetailPage.module.css'

// ─── Add-price mini-form ───────────────────────────────────

interface AddPriceValues {
  currency: Currency
  unitPrice: number | undefined
  placeId: string | undefined
}

const addPriceSchema = Yup.object({
  currency: Yup.mixed<Currency>().oneOf(Object.values(Currency)).required(),
  unitPrice: Yup.number()
    .transform((v, orig) => (orig === '' ? undefined : v))
    .required('El precio es requerido')
    .min(0.01, 'Debe ser mayor a 0'),
  placeId: Yup.string().required('El local es requerido'),
})

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

// ─── Main page ─────────────────────────────────────────────

export default function ProductDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [addingPrice, setAddingPrice] = useState(false)
  const [showPlaceModal, setShowPlaceModal] = useState(false)
  const [editingRow, setEditingRow] = useState<{ placeId: string; placeName: string; unitPrice: number; currency: Currency } | null>(null)

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

  if (isLoading) return <LoadingSpinner fullPage />
  if (error || !product) return <ErrorMessage message="No se pudo cargar el producto." />

  const category = categories.find((c) => c.id === product.productCategoryId)
  const brand = product.brandId ? brands.find((b) => b.id === product.brandId) : undefined
  const placeNames = Object.fromEntries(places.map((p) => [p.id, p.name]))

  async function handleUpdate(values: ProductFormValues): Promise<void> {
    await updateProduct({
      name: values.name,
      productCategoryId: values.productCategoryId,
    })
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
    await addPriceRecord({
      productId: globalId,
      placeId: values.placeId,
      unitPrice: values.unitPrice,
      currency: values.currency,
      recordedAt: new Date().toISOString().split('T')[0] as string,
    })
    setEditingRow(null)
  }

  async function handleDelete(): Promise<void> {
    if (!window.confirm('¿Eliminar este producto?')) return
    await deleteProduct(product.id)
    navigate('/settings/products')
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <button className={styles.back} onClick={() => navigate(-1)} aria-label="Volver">
            ←
          </button>
          {!editing && (
            <button className={styles.editBtn} onClick={() => setEditing(true)}>
              ✏️ Editar
            </button>
          )}
        </div>

        <div className={styles.iconWrap} aria-hidden>
          {category?.icon ?? '📦'}
        </div>
        <h1 className={styles.name}>{product.name}</h1>

        <div className={styles.badges}>
          {category && <span className={styles.badge}>{category.name}</span>}
          {brand && <span className={styles.badge}>{brand.name}</span>}
        </div>
      </header>

      <div className={styles.body}>
        {/* Edit form — only name + category, no pricingType/brand */}
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

        {/* Price by place */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Precio por local</h2>
            {!addingPrice && !editingRow && (
              <button className={styles.addPriceBtn} onClick={() => setAddingPrice(true)}>
                ＋ Agregar precio
              </button>
            )}
          </div>

          {/* Add new price (only for places not yet listed) */}
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
                      <PriceField />
                    </div>
                    <div className={styles.addPricePlaceWrap}>
                      <SelectInput
                        name="placeId"
                        options={availablePlaces.map((p) => ({ value: p.id, label: p.name }))}
                        placeholder="Seleccioná un local"
                        icon="📍"
                      />
                      <p className={styles.addPricePlaceHint}>
                        ¿No encontrás el local?{' '}
                        <button type="button" className={styles.addPricePlaceLink} onClick={() => setShowPlaceModal(true)}>
                          Crear nuevo
                        </button>
                      </p>
                    </div>
                    <div className={styles.addPriceActions}>
                      <Button type="button" variant="ghost" onClick={() => setAddingPrice(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" loading={isSubmitting}>
                        Registrar precio
                      </Button>
                    </div>
                    {showPlaceModal && (
                      <NewPlaceModal
                        onClose={() => setShowPlaceModal(false)}
                        onCreated={(place) => {
                          void setFieldValue('placeId', place.id)
                          setShowPlaceModal(false)
                        }}
                      />
                    )}
                  </Form>
                )}
              </Formik>
            )
          })()}

          {/* Edit existing place price */}
          {editingRow && (
            <Formik<AddPriceValues>
              initialValues={{ currency: editingRow.currency, unitPrice: editingRow.unitPrice, placeId: editingRow.placeId }}
              validationSchema={addPriceSchema}
              onSubmit={handleEditPrice}
            >
              {({ isSubmitting }) => (
                <Form className={styles.addPriceForm}>
                  <p className={styles.editPriceLabel}>Actualizar precio en <strong>{editingRow.placeName}</strong></p>
                  <div className={styles.addPriceRow}>
                    <CurrencyField />
                    <PriceField />
                  </div>
                  <div className={styles.addPriceActions}>
                    <Button type="button" variant="ghost" onClick={() => setEditingRow(null)}>
                      Cancelar
                    </Button>
                    <Button type="submit" loading={isSubmitting}>
                      Guardar precio
                    </Button>
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

        {/* Price history chart */}
        {priceHistory.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Evolución de precios</h2>
            </div>
            <div className={styles.chartWrap}>
              <PriceHistoryChart records={priceHistory} placeNames={placeNames} />
            </div>
          </section>
        )}

        {/* Delete — always at the bottom */}
        <div className={styles.deleteWrap}>
          <Button variant="danger" fullWidth onClick={() => void handleDelete()}>
            Eliminar producto
          </Button>
        </div>
      </div>
    </div>
  )
}
