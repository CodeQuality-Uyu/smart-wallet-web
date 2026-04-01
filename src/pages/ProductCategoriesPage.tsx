// src/pages/ProductCategoriesPage.tsx

import React, { useState } from 'react'
import { Formik, Form } from 'formik'
import {
  useProductCategories,
  useCreateProductCategory,
  useUpdateProductCategory,
} from '@/features/products/hooks/useProductCategories'
import { productCategorySchema, type ProductCategoryFormValues } from '@/features/products/schemas/productCategorySchema'
import { FormField, TextInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { ProductCategory } from '@/types/models'
import styles from './ProductCategoriesPage.module.css'

const ICON_OPTIONS = ['🛒','🥛','🥦','🍎','🍞','🥩','🐟','🧃','🫙','🍫','🧴','🧹','💊','🐾','📦','🍳']

export default function ProductCategoriesPage(): React.ReactElement {
  const { data: categories = [], isLoading } = useProductCategories()
  const { mutateAsync: createCat } = useCreateProductCategory()
  const [editing, setEditing] = useState<ProductCategory | null>(null)
  const [showForm, setShowForm] = useState(false)
  const { mutateAsync: updateCat } = useUpdateProductCategory(editing?.id ?? '')

  if (isLoading) return <LoadingSpinner fullPage />

  async function handleSubmit(
    values: ProductCategoryFormValues,
    { setStatus }: { setStatus: (s: string) => void },
  ): Promise<void> {
    try {
      if (editing) {
        await updateCat(values)
      } else {
        await createCat(values)
      }
      setShowForm(false)
      setEditing(null)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  function startEdit(cat: ProductCategory): void {
    setEditing(cat)
    setShowForm(true)
  }

  const initialValues: ProductCategoryFormValues = {
    name: editing?.name ?? '',
    icon: editing?.icon ?? '',
  }

  return (
    <div>
      <PageHeader title="Categorías de productos" showBack />

      <div className={styles.body}>
        <button
          className={styles.addBtn}
          onClick={() => { setEditing(null); setShowForm(true) }}
        >
          ＋ Agregar categoría
        </button>

        {showForm && (
          <div className={styles.form}>
            <h2 className={styles.formTitle}>
              {editing ? 'Editar categoría' : 'Nueva categoría'}
            </h2>
            <Formik
              initialValues={initialValues}
              validationSchema={productCategorySchema}
              onSubmit={handleSubmit}
              enableReinitialize
            >
              {({ isSubmitting, values, setFieldValue, status }) => (
                <Form>
                  <div className={styles.formRow}>
                    <div style={{ width: 60 }}>
                      <FormField name="icon" label="Ícono">
                        <TextInput
                          name="icon"
                          style={{ textAlign: 'center', fontSize: 20, padding: 8 }}
                        />
                      </FormField>
                    </div>
                    <div style={{ flex: 1 }}>
                      <FormField name="name" label="Nombre">
                        <TextInput name="name" placeholder="ej. Lácteos" />
                      </FormField>
                    </div>
                  </div>

                  <div className={styles.iconPicker} role="group" aria-label="Seleccionar ícono">
                    {ICON_OPTIONS.map((ico) => (
                      <button
                        key={ico}
                        type="button"
                        className={[styles.icoBtn, values.icon === ico ? styles.icoBtnActive : ''].join(' ')}
                        onClick={() => void setFieldValue('icon', ico)}
                        aria-label={ico}
                        aria-pressed={values.icon === ico}
                      >
                        {ico}
                      </button>
                    ))}
                  </div>

                  {status && <p className={styles.formError}>{status}</p>}

                  <div className={styles.formActions}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowForm(false); setEditing(null) }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" variant="secondary" size="sm" loading={isSubmitting}>
                      Guardar
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        )}

        <div className={styles.grid}>
          {categories.map((cat) => (
            <div key={cat.id} className={styles.tile}>
              <span className={styles.tileIcon}>{cat.icon}</span>
              <span className={styles.tileName}>{cat.name}</span>
              <button
                className={styles.editBtn}
                onClick={() => startEdit(cat)}
                aria-label={`Editar ${cat.name}`}
              >
                ✏
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
