// src/pages/CategoriesPage.tsx

import React, { useState } from 'react'
import { Formik, Form } from 'formik'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/features/categories/hooks/useCategories'
import { categorySchema, type CategoryFormValues } from '@/features/categories/schemas/categorySchema'
import { FormField, TextInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/shared/PageHeader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { Category } from '@/types/models'
import styles from './CategoriesPage.module.css'

const ICON_OPTIONS = ['🍔','🚌','🏠','💊','🎬','☕','✈️','🎓','🛒','💄','🐾','🎮','🏋','⚡','🛠','📚']

export default function CategoriesPage(): React.ReactElement {
  const { data: categories = [], isLoading } = useCategories()
  const { mutateAsync: createCat } = useCreateCategory()
  const { mutateAsync: deleteCat } = useDeleteCategory()
  const [editing, setEditing] = useState<Category | null>(null)
  const [showForm, setShowForm] = useState(false)
  const { mutateAsync: updateCat } = useUpdateCategory(editing?.id ?? '')

  if (isLoading) return <LoadingSpinner fullPage />

  async function handleSubmit(
    values: CategoryFormValues,
    { setStatus }: { setStatus: (status: string) => void },
  ): Promise<void> {
    try {
      if (editing) {
        await updateCat(values)
      } else {
        await createCat({ ...values, active: true })
      }
      setShowForm(false)
      setEditing(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Error al guardar'
      setStatus(msg)
    }
  }

  function startEdit(cat: Category): void {
    setEditing(cat)
    setShowForm(true)
  }

  const initialValues: CategoryFormValues = {
    name: editing?.name ?? '',
    icon: editing?.icon ?? '',
    color: editing?.color ?? '',
  }

  return (
    <div>
      <PageHeader title="Categorías" subtitle="Tocá para editar" />

      <div className={styles.body}>
        <button
          className={styles.addBtn}
          onClick={() => { setEditing(null); setShowForm(true) }}
        >
          ＋ Agregar categoría
        </button>

        {/* Inline edit/create form */}
        {showForm && (
          <div className={styles.form}>
            <h2 className={styles.formTitle}>
              {editing ? 'Editar categoría' : 'Nueva categoría'}
            </h2>
            <Formik
              initialValues={initialValues}
              validationSchema={categorySchema}
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
                        <TextInput name="name" placeholder="ej. Comida" />
                      </FormField>
                    </div>
                  </div>

                  {/* Icon picker */}
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

                  {status && (
                    <p className={styles.formError}>{status}</p>
                  )}

                  <div className={styles.formActions}>
                    {editing && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={async () => {
                          if (!window.confirm('¿Eliminar categoría?')) return
                          await deleteCat(editing.id)
                          setEditing(null)
                          setShowForm(false)
                        }}
                      >
                        Eliminar
                      </Button>
                    )}
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
