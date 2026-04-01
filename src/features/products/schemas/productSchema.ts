// src/features/products/schemas/productSchema.ts
import * as Yup from 'yup'
import { ProductPricingType, WeightUnit, Currency } from '@/types/enums'

// ─── Base schema (edición) — precio no requerido ───────────

export const productSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required('El nombre es requerido')
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres'),

  pricingType: Yup.mixed<ProductPricingType>()
    .oneOf(Object.values(ProductPricingType), 'Tipo de precio inválido')
    .required('El tipo de precio es requerido'),

  weightUnit: Yup.mixed<WeightUnit>()
    .oneOf(Object.values(WeightUnit), 'Unidad inválida')
    .when('pricingType', {
      is: ProductPricingType.ByWeight,
      then: (schema) => schema.required('La unidad de peso es requerida'),
      otherwise: (schema) => schema.optional(),
    }),

  productCategoryId: Yup.string()
    .required('La categoría es requerida'),

  brandId: Yup.string().optional(),

  globalProductId: Yup.string().optional(),

  unitPrice:          Yup.number().transform((v, orig) => (orig === '' ? undefined : v)).optional(),
  currency:           Yup.mixed<Currency>().oneOf(Object.values(Currency)).optional(),
  priceRecordPlaceId: Yup.string().optional(),
})

export type ProductFormValues = Yup.InferType<typeof productSchema>

// ─── Schema de creación — precio obligatorio ───────────────

export const productCreateSchema = productSchema.shape({
  unitPrice: Yup.number()
    .transform((v, orig) => (orig === '' ? undefined : v))
    .required('El precio es requerido')
    .min(0.01, 'El precio debe ser mayor a 0'),

  currency: Yup.mixed<Currency>()
    .oneOf(Object.values(Currency))
    .required('La moneda es requerida'),

  priceRecordPlaceId: Yup.string()
    .required('El local es requerido'),
})
