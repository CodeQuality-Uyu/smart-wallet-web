// src/features/categories/schemas/categorySchema.ts
import * as Yup from 'yup'

export const categorySchema = Yup.object({
  name: Yup.string().trim().min(2, 'Mínimo 2 caracteres').max(50, 'Máximo 50 caracteres').required('El nombre es obligatorio'),
  icon: Yup.string().trim().min(1, 'Seleccioná un ícono').required('Seleccioná un ícono'),
  color: Yup.string().optional(),
  limitUYU: Yup.number().typeError('Ingresá un número válido').min(0, 'El límite no puede ser negativo').optional(),
  limitUSD: Yup.number().typeError('Ingresá un número válido').min(0, 'El límite no puede ser negativo').optional(),
})

export type CategoryFormValues = Yup.InferType<typeof categorySchema>
