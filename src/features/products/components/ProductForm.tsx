// src/features/products/components/ProductForm.tsx

import React, { useCallback, useEffect, useState } from 'react'
import { Formik, Form, useField, useFormikContext } from 'formik'
import { productSchema, productCreateSchema, type ProductFormValues } from '../schemas/productSchema'
import { FormField, TextInput, SelectInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ProductNameInput } from './ProductNameInput'
import { NewPlaceModal } from '@/features/expenses/components/NewPlaceModal'
import { useProductCategories } from '../hooks/useProductCategories'
import { usePlaces } from '@/features/places/hooks/usePlaces'
import { useBrands, useCreateBrand } from '../hooks/useBrands'
import { ProductPricingType, WeightUnit, Currency } from '@/types/enums'
import type { Brand, GlobalProductSuggestion } from '@/types/models'
import styles from './ProductForm.module.css'

interface ProductFormProps {
  initialValues?: Partial<ProductFormValues>
  onSubmit: (values: ProductFormValues) => Promise<void>
  submitLabel?: string
  onCancel?: () => void
  /** Show required "precio inicial" section (only on create) */
  showPriceSection?: boolean
  /** Edit mode: plain text name, hide pricingType/brand selectors */
  editMode?: boolean
}

const DEFAULT_VALUES: ProductFormValues = {
  name: '',
  pricingType: ProductPricingType.Fixed,
  productCategoryId: '',
  brandId: undefined,
  weightUnit: undefined,
  globalProductId: undefined,
  unitPrice: undefined,
  currency: Currency.UYU,
  priceRecordPlaceId: undefined,
}

const PRICING_OPTIONS = [
  { value: ProductPricingType.Fixed,    label: 'Por unidad', icon: '📦' },
  { value: ProductPricingType.ByWeight, label: 'Por peso',   icon: '⚖️' },
]

const WEIGHT_UNIT_OPTIONS = [
  { value: WeightUnit.Kg, label: 'kg' },
  { value: WeightUnit.G,  label: 'g' },
  { value: WeightUnit.L,  label: 'l' },
  { value: WeightUnit.Ml, label: 'ml' },
]

// ─── Category chips (single-select) ───────────────────────

function CategoryChipField(): React.ReactElement {
  const { data: categories = [] } = useProductCategories()
  const [field, , helpers] = useField('productCategoryId')

  return (
    <div className={styles.chipsWrap} role="group" aria-label="Categoría">
      {categories.map((cat) => {
        const selected = field.value === cat.id
        return (
          <button
            key={cat.id}
            type="button"
            className={[styles.chip, selected ? styles.chipSelected : ''].join(' ')}
            onClick={() => void helpers.setValue(cat.id)}
          >
            <span aria-hidden>{cat.icon}</span>
            {cat.name}
          </button>
        )
      })}
    </div>
  )
}

// ─── Pricing type card selector ────────────────────────────

function PricingTypeField({ locked }: { locked?: boolean }): React.ReactElement {
  const [field, , helpers] = useField('pricingType')
  const { setFieldValue } = useFormikContext<ProductFormValues>()

  function handleSelect(val: ProductPricingType) {
    if (locked) return
    void helpers.setValue(val)
    // Auto-select first weight unit when switching to ByWeight
    if (val === ProductPricingType.ByWeight) {
      void setFieldValue('weightUnit', WeightUnit.Kg)
    } else {
      void setFieldValue('weightUnit', undefined)
    }
  }

  return (
    <div
      className={[styles.typeSelector, locked ? styles.typeSelectorLocked : ''].join(' ')}
      role="group"
      aria-label="Tipo de precio"
    >
      {PRICING_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={locked}
          className={[styles.typeOpt, field.value === opt.value ? styles.typeOptActive : ''].join(' ')}
          onClick={() => handleSelect(opt.value)}
        >
          <span aria-hidden>{opt.icon}</span>
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Weight unit card selector ─────────────────────────────

function WeightUnitField(): React.ReactElement {
  const [field, meta, helpers] = useField('weightUnit')
  const hasError = Boolean(meta.touched && meta.error)
  return (
    <div>
      <div className={styles.unitSelector} role="group" aria-label="Unidad de medida">
        {WEIGHT_UNIT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={[styles.unitOpt, field.value === opt.value ? styles.unitOptActive : ''].join(' ')}
            onClick={() => void helpers.setValue(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {hasError && <p className={styles.fieldError}>{meta.error}</p>}
    </div>
  )
}

// ─── Price section ─────────────────────────────────────────

function PriceSection({ placeLocked }: { placeLocked?: boolean }): React.ReactElement {
  const [currencyField, , currencyHelpers] = useField('currency')
  const [priceField, priceMeta] = useField('unitPrice')
  const hasPriceError = Boolean(priceMeta.touched && priceMeta.error)
  const { setFieldValue } = useFormikContext<ProductFormValues>()
  const { data: places = [] } = usePlaces()
  const [showPlaceModal, setShowPlaceModal] = useState(false)

  const placeOptions = places.map((p) => ({ value: p.id, label: p.name }))

  return (
    <div className={styles.priceSection}>
      <p className={styles.priceSectionLabel}>Precio inicial</p>

      <div className={styles.priceRow}>
        <div className={styles.currencyToggle} role="group" aria-label="Moneda">
          {[Currency.UYU, Currency.USD].map((cur) => (
            <button
              key={cur}
              type="button"
              className={[
                styles.currencyBtn,
                currencyField.value === cur ? styles.currencyBtnActive : '',
              ].join(' ')}
              onClick={() => void currencyHelpers.setValue(cur)}
            >
              {cur === Currency.USD ? 'U$S' : '$'}
            </button>
          ))}
        </div>

        <div className={styles.priceInputWrap}>
          <input
            {...priceField}
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            className={[styles.priceInput, hasPriceError ? styles.priceInputError : ''].join(' ')}
            aria-label="Precio unitario"
            value={priceField.value ?? ''}
            onChange={(e) => {
              const val = e.target.value
              void priceField.onChange({ target: { name: priceField.name, value: val === '' ? undefined : parseFloat(val) } })
            }}
          />
        </div>
      </div>
      {hasPriceError && <p className={styles.fieldError}>{priceMeta.error}</p>}

      <FormField name="priceRecordPlaceId" label="Local">
        <SelectInput
          name="priceRecordPlaceId"
          options={placeOptions}
          placeholder="Seleccioná un local"
          icon="📍"
          disabled={placeLocked}
        />
        {!placeLocked && (
          <p className={styles.createHint}>
            ¿No encontrás el local?{' '}
            <button type="button" className={styles.createLink} onClick={() => setShowPlaceModal(true)}>
              Crear nuevo
            </button>
          </p>
        )}
      </FormField>

      {showPlaceModal && (
        <NewPlaceModal
          onClose={() => setShowPlaceModal(false)}
          onCreated={(place) => {
            void setFieldValue('priceRecordPlaceId', place.id)
            setShowPlaceModal(false)
          }}
        />
      )}
    </div>
  )
}

// ─── Auto-select first weightUnit when pricingType changes ─

function WeightUnitAutoSelect(): null {
  const { values, setFieldValue } = useFormikContext<ProductFormValues>()
  useEffect(() => {
    if (values.pricingType === ProductPricingType.ByWeight && !values.weightUnit) {
      void setFieldValue('weightUnit', WeightUnit.Kg)
    }
  }, [values.pricingType, values.weightUnit, setFieldValue])
  return null
}

// ─── New brand modal ────────────────────────────────────────

interface NewBrandModalProps {
  onClose: () => void
  onCreated: (brand: Brand) => void
}

function NewBrandModal({ onClose, onCreated }: NewBrandModalProps): React.ReactElement {
  const { mutateAsync: createBrand } = useCreateBrand()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setError('El nombre es requerido'); return }
    setLoading(true)
    try {
      const created = await createBrand({ name: trimmed })
      onCreated(created)
    } catch {
      setError('Error al crear la marca')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Nueva marca" onClose={onClose} width={360}>
      <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 24px' }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Nombre
          </label>
          <input
            type="text"
            placeholder="ej. Arcor"
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
            autoFocus
            style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--ink)', outline: 'none' }}
          />
        </div>
        {error && <p className={styles.fieldError}>{error}</p>}
        <div className={styles.actions}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>Crear marca</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Inner form (has access to Formik context) ─────────────

function InnerForm({
  submitLabel,
  onCancel,
  showPriceSection,
  editMode,
}: Omit<ProductFormProps, 'initialValues' | 'onSubmit'>): React.ReactElement {
  const { isSubmitting, values, setFieldValue } = useFormikContext<ProductFormValues>()
  const isGlobalSelected = Boolean(values.globalProductId)
  const [showBrandModal, setShowBrandModal] = useState(false)
  const { data: brands = [] } = useBrands()
  const brandOptions = brands.map((b) => ({ value: b.id, label: b.name }))

  const handleSelectGlobal = useCallback(
    (s: GlobalProductSuggestion | null) => {
      if (!s) {
        void setFieldValue('globalProductId', undefined)
        return
      }
      void setFieldValue('globalProductId', s.id)
      void setFieldValue('pricingType', s.pricingType)
      if (s.weightUnit !== undefined) void setFieldValue('weightUnit', s.weightUnit)
      else void setFieldValue('weightUnit', s.pricingType === ProductPricingType.ByWeight ? WeightUnit.Kg : undefined)
      if (s.brandId !== undefined) void setFieldValue('brandId', s.brandId)
      if (s.lastUnitPrice !== undefined) void setFieldValue('unitPrice', s.lastUnitPrice)
      if (s.lastCurrency !== undefined) void setFieldValue('currency', s.lastCurrency)
      if (s.lastPlaceId !== undefined) void setFieldValue('priceRecordPlaceId', s.lastPlaceId)
    },
    [setFieldValue],
  )

  return (
    <Form className={styles.form} noValidate>
      <WeightUnitAutoSelect />

      <FormField name="name" label="Nombre del producto">
        {editMode
          ? <TextInput name="name" placeholder="Nombre del producto" />
          : <ProductNameInput onSelectGlobal={handleSelectGlobal} />
        }
      </FormField>

      <FormField name="productCategoryId" label="Categoría">
        <CategoryChipField />
      </FormField>

      {!editMode && (
        <div className={styles.fieldGroup}>
          <p className={styles.typeLabel}>Tipo de precio</p>
          <PricingTypeField locked={isGlobalSelected} />
          {isGlobalSelected && (
            <p className={styles.lockedHint}>El tipo de precio viene del producto global y no puede modificarse.</p>
          )}
        </div>
      )}

      {values.pricingType === ProductPricingType.ByWeight && !editMode && (
        <div className={styles.fieldGroup}>
          <p className={styles.typeLabel}>Unidad de medida</p>
          <WeightUnitField />
        </div>
      )}

      {!editMode && (
        <FormField name="brandId" label="Marca">
          <SelectInput
            name="brandId"
            options={brandOptions}
            placeholder="Sin marca"
            icon="🏷️"
            disabled={isGlobalSelected}
          />
          {!isGlobalSelected && (
            <p className={styles.createHint}>
              ¿No encontrás la marca?{' '}
              <button type="button" className={styles.createLink} onClick={() => setShowBrandModal(true)}>
                Crear nueva
              </button>
            </p>
          )}
        </FormField>
      )}

      {showBrandModal && (
        <NewBrandModal
          onClose={() => setShowBrandModal(false)}
          onCreated={(brand) => {
            void setFieldValue('brandId', brand.id)
            setShowBrandModal(false)
          }}
        />
      )}

      {showPriceSection && <PriceSection placeLocked={isGlobalSelected} />}

      <div className={styles.actions}>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={isSubmitting} fullWidth={!onCancel}>
          {submitLabel}
        </Button>
      </div>

    </Form>
  )
}

// ─── Main form ─────────────────────────────────────────────

export function ProductForm({
  initialValues,
  onSubmit,
  submitLabel = 'Guardar producto',
  onCancel,
  showPriceSection = false,
  editMode = false,
}: ProductFormProps): React.ReactElement {
  const schema = showPriceSection ? productCreateSchema : productSchema

  return (
    <Formik
      initialValues={{ ...DEFAULT_VALUES, ...initialValues }}
      validationSchema={schema}
      onSubmit={onSubmit}
      enableReinitialize
    >
      <InnerForm
        submitLabel={submitLabel}
        onCancel={onCancel}
        showPriceSection={showPriceSection}
        editMode={editMode}
      />
    </Formik>
  )
}
