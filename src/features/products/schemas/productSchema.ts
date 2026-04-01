// src/features/products/schemas/productSchema.ts
import * as Yup from 'yup'
import { ProductPricingType, WeightUnit } from '@/types/enums'

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
})

export type ProductFormValues = Yup.InferType<typeof productSchema>
