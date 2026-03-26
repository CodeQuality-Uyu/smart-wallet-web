// src/features/places/schemas/placeSchema.ts
import * as Yup from 'yup'

export const placeSchema = Yup.object({
  name: Yup.string().trim().min(2).max(80).required('Name is required'),
  address: Yup.string().trim().max(150).optional(),
})

export type PlaceFormValues = Yup.InferType<typeof placeSchema>
