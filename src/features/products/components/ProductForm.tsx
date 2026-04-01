// src/features/products/components/ProductForm.tsx

import React from 'react'
import { Formik, Form } from 'formik'
import { productSchema, type ProductFormValues } from '../schemas/productSchema'
import { FormField, TextInput, SelectInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { BrandAutocomplete } from './BrandAutocomplete'
import { useProductCategories } from '../hooks/useProductCategories'
import { ProductPricingType, WeightUnit } from '@/types/enums'
import styles from './ProductForm.module.css'

interface ProductFormProps {
  initialValues?: Partial<ProductFormValues>
  onSubmit: (values: ProductFormValues) => Promise<void>
  submitLabel?: string
  onCancel?: () => void
}

const DEFAULT_VALUES: ProductFormValues = {
  name: '',
  pricingType: ProductPricingType.Fixed,
  productCategoryId: '',
  brandId: undefined,
  weightUnit: undefined,
}

const PRICING_OPTIONS = [
  { value: ProductPricingType.Fixed, label: 'Precio fijo (por unidad)' },
  { value: ProductPricingType.ByWeight, label: 'Por peso / volumen' },
]

const WEIGHT_UNIT_OPTIONS = [
  { value: WeightUnit.Kg, label: 'Kilogramos (kg)' },
  { value: WeightUnit.G,  label: 'Gramos (g)' },
  { value: WeightUnit.L,  label: 'Litros (l)' },
  { value: WeightUnit.Ml, label: 'Mililitros (ml)' },
]

export function ProductForm({
  initialValues,
  onSubmit,
  submitLabel = 'Guardar producto',
  onCancel,
}: ProductFormProps): React.ReactElement {
  const { data: categories = [] } = useProductCategories()

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: `${c.icon} ${c.name}`,
  }))

  return (
    <Formik
      initialValues={{ ...DEFAULT_VALUES, ...initialValues }}
      validationSchema={productSchema}
      onSubmit={onSubmit}
      enableReinitialize
    >
      {({ isSubmitting, values }) => (
        <Form className={styles.form} noValidate>

          <FormField name="name" label="Nombre del producto">
            <TextInput name="name" placeholder="ej. Leche Conaprole 1L" />
          </FormField>

          <FormField name="productCategoryId" label="Categoría">
            <SelectInput
              name="productCategoryId"
              options={categoryOptions}
              placeholder="Seleccioná una categoría"
            />
          </FormField>

          <FormField name="pricingType" label="Tipo de precio">
            <SelectInput
              name="pricingType"
              options={PRICING_OPTIONS}
            />
          </FormField>

          {values.pricingType === ProductPricingType.ByWeight && (
            <FormField name="weightUnit" label="Unidad de medida">
              <SelectInput
                name="weightUnit"
                options={WEIGHT_UNIT_OPTIONS}
                placeholder="Seleccioná unidad"
              />
            </FormField>
          )}

          <FormField
            name="brandId"
            label="Marca"
            hint="Opcional — podés crearla si no existe"
          >
            <BrandAutocomplete name="brandId" />
          </FormField>

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
      )}
    </Formik>
  )
}
