// src/features/products/schemas/productCategorySchema.ts
import * as Yup from 'yup'

export const productCategorySchema = Yup.object({
  name: Yup.string().trim().required('El nombre es requerido').min(2, 'Mínimo 2 caracteres').max(50, 'Máximo 50 caracteres'),
  icon: Yup.string().trim().required('El ícono es requerido').min(1, 'El ícono es requerido'),
})

export type ProductCategoryFormValues = Yup.InferType<typeof productCategorySchema>
