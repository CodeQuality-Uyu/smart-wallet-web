// src/features/statements/components/ImportReviewTable.tsx
//
// Tabla de revisión reutilizable para flujos de import (estado de cuenta PDF y
// Gmail). Es presentacional: recibe las filas y callbacks, no persiste nada.

import React, { useRef } from 'react'
import { ControlledSelectInput } from '@/components/ui/FormField'
import { StatementImportAction, Currency } from '@/types/enums'
import type { Category, Place, StatementImportRow } from '@/types/models'
import styles from './StatementImportModal.module.css'

// Checkbox de cabecera con estado indeterminado (parcial) pintado en azul.
function SelectAllCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean
  indeterminate: boolean
  onChange: () => void
}): React.ReactElement {
  const ref = useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      className={styles.checkbox}
      checked={checked}
      onChange={onChange}
      title={checked ? 'Desmarcar todos' : 'Marcar todos'}
      style={indeterminate ? { accentColor: '#2563eb' } : undefined}
    />
  )
}

interface Props {
  rows: StatementImportRow[]
  categories: Category[]
  places: Place[]
  allSelected: boolean
  someSelected: boolean
  createCategoryPending: boolean
  onToggleAll: () => void
  onUpdateRow: (rowId: string, patch: Partial<StatementImportRow>) => void
  onRemoveRow: (rowId: string) => void
  onApplySuggestion: (rowId: string, suggestedName: string) => void
  /** Si se provee, muestra el botón 🔁 para convertir la fila en pago recurrente. */
  onOpenRecurring?: (row: StatementImportRow) => void
  /** Título/tooltip del botón de quitar fila (ej. "Eliminar línea" o "Descartar"). */
  removeTitle?: string
}

export function ImportReviewTable({
  rows,
  categories,
  places,
  allSelected,
  someSelected,
  createCategoryPending,
  onToggleAll,
  onUpdateRow,
  onRemoveRow,
  onApplySuggestion,
  onOpenRecurring,
  removeTitle = 'Eliminar línea',
}: Props): React.ReactElement {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>
              <SelectAllCheckbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={onToggleAll}
              />
            </th>
            <th>Fecha</th>
            <th>Descripción</th>
            <th>Moneda</th>
            <th>Monto</th>
            <th>Categoría</th>
            <th>Local</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSkipped = row.action === StatementImportAction.Skip
            return (
              <tr
                key={row.rowId}
                className={
                  row.imported ? styles.rowImported : isSkipped ? styles.rowSkipped : undefined
                }
              >
                <td>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={!row.imported && !isSkipped}
                    disabled={row.imported}
                    onChange={(e) =>
                      onUpdateRow(row.rowId, {
                        action: e.target.checked
                          ? StatementImportAction.Import
                          : StatementImportAction.Skip,
                      })
                    }
                  />
                </td>
                <td>
                  <input
                    type="date"
                    className={styles.tableInput}
                    value={row.date}
                    style={{ minWidth: 120 }}
                    onChange={(e) => onUpdateRow(row.rowId, { date: e.target.value })}
                  />
                </td>
                <td>
                  <div className={styles.stackCell}>
                    <input
                      type="text"
                      className={styles.tableInput}
                      value={row.description}
                      style={{ minWidth: 180 }}
                      title={row.description}
                      onChange={(e) => onUpdateRow(row.rowId, { description: e.target.value })}
                    />
                    {row.imported && <div className={styles.importedBadge}>✓ Ya importado</div>}
                    {row.matchedExpenseId && !row.imported && (
                      <div className={styles.dupBadge}>⚠️ Posible duplicado</div>
                    )}
                  </div>
                </td>
                <td>
                  <select
                    className={styles.tableSelect}
                    value={row.currency}
                    style={{ minWidth: 70 }}
                    onChange={(e) =>
                      onUpdateRow(row.rowId, { currency: e.target.value as Currency })
                    }
                  >
                    <option value={Currency.UYU}>UYU</option>
                    <option value={Currency.USD}>USD</option>
                  </select>
                </td>
                <td className={styles.amountCell}>
                  <input
                    type="number"
                    className={styles.tableInput}
                    value={row.amount}
                    min={0}
                    style={{ width: 80 }}
                    onChange={(e) =>
                      onUpdateRow(row.rowId, { amount: parseFloat(e.target.value) || 0 })
                    }
                  />
                </td>
                <td>
                  <div className={styles.stackCell} style={{ minWidth: 190 }}>
                    <ControlledSelectInput
                      value={row.categoryId ?? ''}
                      onChange={(v) => onUpdateRow(row.rowId, { categoryId: v || undefined })}
                      options={categories.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }))}
                      placeholder="Sin categoría"
                      icon={row.categoryId ? undefined : '🏷️'}
                    />
                    {row.suggestedCategoryName && !row.categoryId && (
                      <button
                        className={styles.catSuggestion}
                        disabled={createCategoryPending}
                        onClick={() => void onApplySuggestion(row.rowId, row.suggestedCategoryName!)}
                        title={`Sugerencia IA: ${row.suggestedCategoryName} (clic para asignar o crear)`}
                      >
                        ✨ {row.suggestedCategoryName}
                      </button>
                    )}
                  </div>
                </td>
                <td>
                  <div style={{ minWidth: 190 }}>
                    <ControlledSelectInput
                      value={row.placeId ?? ''}
                      onChange={(v) => onUpdateRow(row.rowId, { placeId: v || undefined })}
                      options={places.map((p) => ({
                        value: p.id,
                        label: p.icon ? `${p.icon} ${p.name}` : p.name,
                      }))}
                      placeholder="Sin local"
                      icon="📍"
                    />
                  </div>
                </td>
                <td>
                  <div className={styles.rowActions}>
                    {onOpenRecurring && (
                      <button
                        type="button"
                        className={styles.rowRecurring}
                        onClick={() => onOpenRecurring(row)}
                        title="Crear pago recurrente desde esta línea"
                        aria-label="Crear pago recurrente desde esta línea"
                      >
                        🔁
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.rowDelete}
                      onClick={() => onRemoveRow(row.rowId)}
                      title={removeTitle}
                      aria-label={removeTitle}
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
