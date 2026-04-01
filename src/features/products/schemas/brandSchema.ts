// src/features/products/schemas/brandSchema.ts
import * as Yup from 'yup'

export const brandSchema = Yup.object({
  name: Yup.string().trim().required('El nombre es requerido').min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres'),
})

export type BrandFormValues = Yup.InferType<typeof brandSchema>
