// src/features/products/components/ProductCategoryPickerModal.tsx

import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useProductCategories, useCreateProductCategory } from '../hooks/useProductCategories'
import type { ProductCategory } from '@/types/models'
import styles from './ProductCategoryPickerModal.module.css'

const CAT_ICONS = [
  '🛒','🥛','🥦','🍎','🍞','🥩','🐟','🧃','🫙','🍫','🧴','🧹',
  '💊','🐾','📦','🍳','🧀','🥚','🍗','🌽','🥕','🍋','🧆','🥜',
]

const CAT_COLORS = [
  '#ef4444','#f97316','#f5b732','#10b981','#3b82f6','#8b5cf6',
  '#ec4899','#6b7280','#14b8a6','#84cc16',
]

interface ProductCategoryPickerModalProps {
  selected: string
  onConfirm: (id: string) => void
  onClose: () => void
}

export function ProductCategoryPickerModal({
  selected: initialSelected,
  onConfirm,
  onClose,
}: ProductCategoryPickerModalProps): React.ReactElement {
  const { data: categories = [] } = useProductCategories()
  const { mutateAsync: createCat } = useCreateProductCategory()

  const [selected, setSelected] = useState(initialSelected)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  // Create form state
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState(CAT_ICONS[0]!)
  const [newColor, setNewColor] = useState(CAT_COLORS[0]!)
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)

  const filtered = search.trim()
    ? categories.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    : categories

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    const trimmed = newName.trim()
    if (!trimmed) { setCreateError('El nombre es requerido'); return }
    setCreating(true)
    try {
      const created: ProductCategory = await createCat({ name: trimmed, icon: newIcon, color: newColor })
      setSelected(created.id)
      setShowCreate(false)
      setNewName('')
      setNewIcon(CAT_ICONS[0]!)
      setNewColor(CAT_COLORS[0]!)
    } catch {
      setCreateError('Error al crear la categoría')
    } finally {
      setCreating(false)
    }
  }

  const addBtn = showCreate ? null : (
    <button type="button" className={styles.headerAddBtn} onClick={() => setShowCreate(true)}>＋</button>
  )

  return (
    <Modal title="Categorías" onClose={onClose} width={480} titleAction={addBtn}>

      {/* Search */}
      <div className={styles.searchBar}>
        <span className={styles.searchIcon} aria-hidden>🔍</span>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Buscar categoría..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus={!showCreate}
        />
      </div>

      <div className={styles.body}>
        {/* Inline create form */}
        {showCreate && (
          <form onSubmit={(e) => void handleCreate(e)} className={styles.createForm}>
            <div className={styles.createNameRow}>
              <input
                type="text"
                placeholder="Nombre de la categoría"
                value={newName}
                autoFocus
                onChange={(e) => { setNewName(e.target.value); setCreateError('') }}
                className={styles.createNameInput}
              />
            </div>

            <div className={styles.pickerSection}>
              <p className={styles.pickerLabel}>Ícono</p>
              <div className={styles.iconGrid}>
                {CAT_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    className={[styles.iconBtn, ic === newIcon ? styles.iconBtnActive : ''].join(' ')}
                    onClick={() => setNewIcon(ic)}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.pickerSection}>
              <p className={styles.pickerLabel}>Color</p>
              <div className={styles.colorGrid}>
                {CAT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={styles.colorBtn}
                    style={{ background: c, border: `3px solid ${c === newColor ? 'var(--ink)' : 'transparent'}` }}
                    onClick={() => setNewColor(c)}
                  />
                ))}
              </div>
            </div>

            {createError && <p className={styles.createError}>{createError}</p>}

            <div className={styles.createActions}>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button type="submit" size="sm" loading={creating}>Crear categoría</Button>
            </div>
          </form>
        )}

        {/* Tile grid */}
        {filtered.length === 0 ? (
          <p className={styles.empty}>No hay categorías que coincidan.</p>
        ) : (
          <div className={styles.grid}>
            {filtered.map((cat) => {
              const isSelected = selected === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={[styles.tile, isSelected ? styles.tileSelected : ''].join(' ')}
                  onClick={() => setSelected(cat.id)}
                >
                  <span className={styles.tileIcon}>{cat.icon}</span>
                  <span className={styles.tileName}>{cat.name}</span>
                  {isSelected && <span className={styles.tileCheck}>✓</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => onConfirm(selected)} disabled={!selected}>
          Confirmar
        </Button>
      </div>
    </Modal>
  )
}
