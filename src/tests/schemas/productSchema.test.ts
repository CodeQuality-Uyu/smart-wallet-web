// src/tests/schemas/productSchema.test.ts

import { describe, it, expect } from 'vitest'
import { productSchema } from '@/features/products/schemas/productSchema'
import { ProductPricingType, WeightUnit } from '@/types/enums'

const VALID_FIXED = {
  name: 'Leche Conaprole 1L',
  pricingType: ProductPricingType.Fixed,
  productCategoryId: 'pcat-1',
}

const VALID_BY_WEIGHT = {
  name: 'Papa Blanca',
  pricingType: ProductPricingType.ByWeight,
  weightUnit: WeightUnit.Kg,
  productCategoryId: 'pcat-2',
}

describe('productSchema', () => {
  describe('casos válidos', () => {
    it('valida un producto Fixed sin marca', async () => {
      await expect(productSchema.validate(VALID_FIXED)).resolves.toBeDefined()
    })

    it('valida un producto Fixed con marca', async () => {
      await expect(productSchema.validate({ ...VALID_FIXED, brandId: 'brand-1' })).resolves.toBeDefined()
    })

    it('valida un producto ByWeight con unidad', async () => {
      await expect(productSchema.validate(VALID_BY_WEIGHT)).resolves.toBeDefined()
    })

    it('acepta todas las unidades de peso válidas', async () => {
      for (const unit of Object.values(WeightUnit)) {
        await expect(productSchema.validate({ ...VALID_BY_WEIGHT, weightUnit: unit })).resolves.toBeDefined()
      }
    })
  })

  describe('nombre', () => {
    it('rechaza nombre vacío', async () => {
      await expect(productSchema.validate({ ...VALID_FIXED, name: '' })).rejects.toThrow('El nombre es requerido')
    })

    it('rechaza nombre menor a 2 caracteres', async () => {
      await expect(productSchema.validate({ ...VALID_FIXED, name: 'A' })).rejects.toThrow('Mínimo 2 caracteres')
    })

    it('rechaza nombre mayor a 100 caracteres', async () => {
      await expect(productSchema.validate({ ...VALID_FIXED, name: 'A'.repeat(101) })).rejects.toThrow('Máximo 100 caracteres')
    })

    it('trim — elimina espacios al inicio/fin', async () => {
      const result = await productSchema.validate({ ...VALID_FIXED, name: '  Papa Blanca  ' })
      expect(result.name).toBe('Papa Blanca')
    })
  })

  describe('pricingType', () => {
    it('rechaza tipo de precio inválido', async () => {
      await expect(productSchema.validate({ ...VALID_FIXED, pricingType: 'hourly' })).rejects.toThrow('Tipo de precio inválido')
    })

    it('rechaza pricingType ausente', async () => {
      const { pricingType: _, ...rest } = VALID_FIXED
      await expect(productSchema.validate(rest)).rejects.toThrow('El tipo de precio es requerido')
    })
  })

  describe('weightUnit — validación condicional', () => {
    it('ByWeight sin weightUnit → inválido', async () => {
      const { weightUnit: _, ...rest } = VALID_BY_WEIGHT
      await expect(productSchema.validate(rest)).rejects.toThrow('La unidad de peso es requerida')
    })

    it('Fixed con weightUnit → válido (campo ignorado)', async () => {
      await expect(
        productSchema.validate({ ...VALID_FIXED, weightUnit: WeightUnit.Kg }),
      ).resolves.toBeDefined()
    })

    it('rechaza unidad de peso inválida', async () => {
      await expect(
        productSchema.validate({ ...VALID_BY_WEIGHT, weightUnit: 'oz' }),
      ).rejects.toThrow('Unidad inválida')
    })
  })

  describe('productCategoryId', () => {
    it('rechaza categoría ausente', async () => {
      const { productCategoryId: _, ...rest } = VALID_FIXED
      await expect(productSchema.validate(rest)).rejects.toThrow('La categoría es requerida')
    })
  })
})
