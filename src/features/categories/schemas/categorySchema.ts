// src/features/categories/schemas/categorySchema.ts
import * as Yup from 'yup'

export const categorySchema = Yup.object({
  name: Yup.string().trim().min(2).max(50).required('Name is required'),
  icon: Yup.string().trim().min(1, 'Select an icon').required('Icon is required'),
  color: Yup.string().optional(),
})

export type CategoryFormValues = Yup.InferType<typeof categorySchema>
