// src/features/expenses/components/CategoryPickerModal.tsx

import React, { useState, useRef, useEffect } from 'react'
import { Formik, Form } from 'formik'
import { Modal } from '@/components/ui/Modal'
import { useCategories, useCreateCategory } from '@/features/categories/hooks/useCategories'
import { categorySchema, type CategoryFormValues } from '@/features/categories/schemas/categorySchema'
import { FormField, TextInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import type { Category, CreateCategoryPayload } from '@/types/models'
import styles from './CategoryPickerModal.module.css'

const ICON_OPTIONS = ['🍔','🚌','🏠','💊','🎬','☕','✈️','🎓','🛒','💄','🐾','🎮','🏋','⚡','🛠','📚']
const PAGE_SIZE = 24

interface CategoryPickerModalProps {
  selected: string[]
  onConfirm: (ids: string[]) => void
  onClose: () => void
}

export function CategoryPickerModal({
  selected: initialSelected,
  onConfirm,
  onClose,
}: CategoryPickerModalProps): React.ReactElement {
  const { data: categories = [] } = useCategories()
  const { mutateAsync: createCategory } = useCreateCategory()

  const [selected, setSelected] = useState<string[]>(initialSelected)
  const [search, setSearch] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const sentinelRef = useRef<HTMLDivElement>(null)

  const filtered = search.trim()
    ? categories.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    : categories

  // Reset pagination when search changes
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [search])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length))
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [filtered.length])

  function toggle(id: string): void {
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id])
  }

  async function handleCreate(
    values: CategoryFormValues,
    { setStatus, resetForm }: { setStatus: (s: string) => void; resetForm: () => void },
  ): Promise<void> {
    try {
      const cat: Category = await createCategory({ ...values, active: true } as CreateCategoryPayload)
      // Select the new category and close create form without closing the modal
      setSelected((prev) => [...prev, cat.id])
      setShowCreateForm(false)
      resetForm()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar'
      setStatus(msg)
    }
  }

  const visibleCategories = filtered.slice(0, visibleCount)

  const createBtn = showCreateForm ? null : (
    <button
      type="button"
      className={styles.headerCreateBtn}
      onClick={() => setShowCreateForm(true)}
      title="Crear categoría"
    >
      ＋
    </button>
  )

  return (
    <Modal title="Categorías" onClose={onClose} width={560} titleAction={createBtn}>

      {/* Search bar */}
      <div className={styles.searchBar}>
        <span className={styles.searchIcon} aria-hidden>🔍</span>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Buscar categoría..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Scrollable area: optional create form + tile grid */}
      <div className={styles.list}>

        {/* Inline create form — shown at top of list when active */}
        {showCreateForm && (
          <div className={styles.createForm}>
            <Formik<CategoryFormValues>
              initialValues={{ name: '', icon: '', color: '' }}
              validationSchema={categorySchema}
              onSubmit={handleCreate}
            >
              {({ isSubmitting, values, setFieldValue, status }) => (
                <Form>
                  <div className={styles.createFormRow}>
                    <div style={{ width: 60 }}>
                      <FormField name="icon" label="Ícono">
                        <TextInput name="icon" style={{ textAlign: 'center', fontSize: 20, padding: 8 }} />
                      </FormField>
                    </div>
                    <div style={{ flex: 1 }}>
                      <FormField name="name" label="Nombre">
                        <TextInput name="name" placeholder="ej. Comida" />
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
                      >
                        {ico}
                      </button>
                    ))}
                  </div>

                  {status && <p className={styles.formError}>{status}</p>}

                  <div className={styles.createFormActions}>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" variant="secondary" size="sm" loading={isSubmitting}>
                      Crear categoría
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        )}

        {/* Tile grid */}
        {visibleCategories.length === 0 ? (
          <p className={styles.empty}>No hay categorías que coincidan.</p>
        ) : (
          <div className={styles.grid}>
            {visibleCategories.map((cat) => {
              const isSelected = selected.includes(cat.id)
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={[styles.tile, isSelected ? styles.tileSelected : ''].join(' ')}
                  onClick={() => toggle(cat.id)}
                >
                  <span className={styles.tileIcon}>{cat.icon}</span>
                  <span className={styles.tileName}>{cat.name}</span>
                  {isSelected && <span className={styles.tileCheck}>✓</span>}
                </button>
              )
            })}
          </div>
        )}
        {/* Sentinel for infinite scroll */}
        {visibleCount < filtered.length && <div ref={sentinelRef} className={styles.sentinel} />}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => onConfirm(selected)}>
          {selected.length > 0 ? `Confirmar (${selected.length})` : 'Confirmar'}
        </Button>
      </div>
    </Modal>
  )
}
