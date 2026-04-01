// src/tests/schemas/brandSchema.test.ts

import { describe, it, expect } from 'vitest'
import { brandSchema } from '@/features/products/schemas/brandSchema'

const VALID = { name: 'Conaprole' }

describe('brandSchema', () => {
  it('valida una marca correcta', async () => {
    await expect(brandSchema.validate(VALID)).resolves.toBeDefined()
  })

  it('rechaza nombre vacío', async () => {
    await expect(brandSchema.validate({ name: '' })).rejects.toThrow('El nombre es requerido')
  })

  it('rechaza nombre menor a 2 caracteres', async () => {
    await expect(brandSchema.validate({ name: 'A' })).rejects.toThrow('Mínimo 2 caracteres')
  })

  it('rechaza nombre mayor a 80 caracteres', async () => {
    await expect(brandSchema.validate({ name: 'A'.repeat(81) })).rejects.toThrow('Máximo 80 caracteres')
  })

  it('trim — acepta nombre con espacios al inicio/fin', async () => {
    const result = await brandSchema.validate({ name: '  Arcor  ' })
    expect(result.name).toBe('Arcor')
  })
})
