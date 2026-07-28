// src/features/categories/components/NewCategoryModal.tsx
// Modal mínimo para crear una categoría al vuelo (nombre + ícono + color).

import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useCreateCategory } from '@/features/categories/hooks/useCategories'
import type { Category } from '@/types/models'
import styles from './NewCategoryModal.module.css'

const ICONS = ['🏷️', '🍔', '🛒', '🚗', '🏥', '💡', '🎬', '👕', '🎮', '🏠', '✈️', '📱']
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b']

interface Props {
  onClose: () => void
  onCreated: (category: Category) => void
  /** Nombre inicial (ej. la sugerencia de IA de la fila). */
  initialName?: string
}

export function NewCategoryModal({ onClose, onCreated, initialName = '' }: Props): React.ReactElement {
  const { mutateAsync: createCategory, isPending } = useCreateCategory()
  const [name, setName] = useState(initialName)
  const [icon, setIcon] = useState(ICONS[0]!)
  const [color, setColor] = useState(COLORS[0]!)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(): Promise<void> {
    if (!name.trim()) {
      setError('Poné un nombre.')
      return
    }
    setError(null)
    try {
      const created = await createCategory({ name: name.trim(), icon, color, active: true })
      onCreated(created)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la categoría.')
    }
  }

  return (
    <Modal title="Nueva categoría" onClose={onClose} width={400}>
      <div className={styles.body}>
        <label className={styles.label}>Nombre</label>
        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ej. Delivery"
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleCreate()
          }}
          autoFocus
        />

        <label className={styles.label}>Ícono</label>
        <div className={styles.iconGrid}>
          {ICONS.map((i) => (
            <button
              key={i}
              type="button"
              className={[styles.iconBtn, i === icon ? styles.iconActive : ''].join(' ')}
              onClick={() => setIcon(i)}
            >
              {i}
            </button>
          ))}
        </div>

        <label className={styles.label}>Color</label>
        <div className={styles.colorGrid}>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={[styles.colorBtn, c === color ? styles.colorActive : ''].join(' ')}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleCreate()} loading={isPending}>
            Crear categoría
          </Button>
        </div>
      </div>
    </Modal>
  )
}
