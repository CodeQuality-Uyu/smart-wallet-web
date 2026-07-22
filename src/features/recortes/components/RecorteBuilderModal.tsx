// src/features/recortes/components/RecorteBuilderModal.tsx
// Crear: prompt → sugerencias → procesar → preview editable → crear.
// Editar: arranca en el preview pre-cargado con el recorte existente.

import React, { useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { PeriodControl } from '@/components/ui/PeriodControl'
import {
  useDraftRecorte,
  useCreateRecorte,
  useUpdateRecorte,
  useRecomputeRecorte,
} from '../hooks/useRecortes'
import {
  RECORTE_PERIODS,
  OUTPUT_FORMATS,
  RECORTE_TEMPLATES,
  type RecorteTemplate,
} from '../recorteConstants'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { PeriodFilter, RecorteOutputFormat } from '@/types/enums'
import type { Recorte } from '@/types/models'
import styles from './RecorteBuilderModal.module.css'

// Presets de ícono y color del recorte. En cada picker, la última opción permite
// elegir un valor libre (emoji propio / color custom), igual que en Categorías.
const ICON_OPTIONS = [
  '✂️', '💰', '📊', '🐜', '🔁', '📈', '🚦', '🎯', '🍔', '🛒',
  '☕', '🎬', '🚌', '🏠', '💊', '🎮', '💡', '⚠️', '✅', '🧾',
]

const COLOR_OPTIONS = [
  '#ef4444', '#f97316', '#f5b732', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#6b7280', '#14b8a6', '#84cc16',
  '#ff7043', '#42a5f5', '#ab47bc', '#66bb6a', '#ec407a',
]

/** El rango se define por período predefinido o por una fecha "desde" (calendario), nunca ambos. */
type RangeMode = 'period' | 'since'

interface DraftState {
  name: string
  description: string
  icon: string
  color: string
  outputFormat: RecorteOutputFormat
  period: PeriodFilter
  sinceDate: string
  /** Categorías a las que se acota el análisis. Vacío = todas. */
  categoryIds: string[]
}

interface RecorteBuilderModalProps {
  existingNames: string[]
  onClose: () => void
  /** Si se pasa, el modal edita ese recorte en vez de crear uno nuevo. */
  recorte?: Recorte
}

export function RecorteBuilderModal({
  existingNames,
  onClose,
  recorte,
}: RecorteBuilderModalProps): React.ReactElement {
  const isEditing = Boolean(recorte)

  const [phase, setPhase] = useState<'prompt' | 'preview'>(isEditing ? 'preview' : 'prompt')
  const [prompt, setPrompt] = useState(recorte?.prompt ?? '')
  const [draft, setDraft] = useState<DraftState>({
    name: recorte?.name ?? '',
    description: recorte?.description ?? '',
    icon: recorte?.icon ?? '✂️',
    color: recorte?.color ?? '#4caf50',
    outputFormat: recorte?.outputFormat ?? RecorteOutputFormat.Text,
    period: recorte?.period ?? PeriodFilter.Month,
    sinceDate: recorte?.sinceDate ?? '',
    categoryIds: recorte?.categoryIds ?? [],
  })
  const [rangeMode, setRangeMode] = useState<RangeMode>(recorte?.sinceDate ? 'since' : 'period')

  const { data: categories } = useCategories()
  const draftMutation = useDraftRecorte()
  const createMutation = useCreateRecorte()
  const updateMutation = useUpdateRecorte(recorte?.id ?? '')
  const recomputeMutation = useRecomputeRecorte()

  const existing = useMemo(
    () => new Set(existingNames.map((n) => n.toLowerCase())),
    [existingNames],
  )
  const suggestions = RECORTE_TEMPLATES.filter((t) => !existing.has(t.name.toLowerCase()))

  const saving = createMutation.isPending || updateMutation.isPending || recomputeMutation.isPending
  const saveError = createMutation.isError || updateMutation.isError

  function applyTemplate(t: RecorteTemplate): void {
    setPrompt(t.prompt)
    setDraft({
      name: t.name,
      description: t.prompt,
      icon: t.icon,
      color: t.color,
      outputFormat: t.outputFormat,
      period: t.period,
      sinceDate: '',
      categoryIds: [],
    })
    setPhase('preview')
  }

  function toggleCategory(id: string): void {
    setDraft((d) => ({
      ...d,
      categoryIds: d.categoryIds.includes(id)
        ? d.categoryIds.filter((c) => c !== id)
        : [...d.categoryIds, id],
    }))
  }

  async function handleProcess(): Promise<void> {
    if (prompt.trim().length < 8) return
    const result = await draftMutation.mutateAsync(prompt.trim())
    setDraft((d) => ({
      ...d,
      name: result.name,
      description: result.description,
      icon: result.icon,
      color: result.color,
      outputFormat: result.outputFormat,
    }))
    setPhase('preview')
  }

  async function handleSubmit(): Promise<void> {
    // Con "desde una fecha", el período pasa a ser todo el historial y el filtro
    // efectivo lo aplica sinceDate; con período predefinido no se usa sinceDate.
    const useSince = rangeMode === 'since' && draft.sinceDate.length > 0
    const payload = {
      name: draft.name.trim() || 'Nuevo recorte',
      description: draft.description.trim(),
      prompt: prompt.trim(),
      icon: draft.icon || '✂️',
      color: draft.color,
      outputFormat: draft.outputFormat,
      period: useSince ? PeriodFilter.All : draft.period,
      sinceDate: useSince ? draft.sinceDate : '',
      categoryIds: draft.categoryIds,
    }
    if (recorte) {
      const updated = await updateMutation.mutateAsync(payload)
      // Al cambiar prompt/formato/rango el último resultado queda obsoleto: se recalcula.
      try {
        await recomputeMutation.mutateAsync(updated)
      } catch {
        // Si el recálculo falla (sin API key, red), la edición se guarda igual.
      }
    } else {
      await createMutation.mutateAsync(payload)
    }
    onClose()
  }

  return (
    <Modal title={isEditing ? 'Editar recorte' : 'Nuevo recorte'} onClose={onClose} width={560}>
      {phase === 'prompt' ? (
        <div className={styles.body}>
          <label className={styles.label} htmlFor="recorte-prompt">
            ¿Qué querés que analice?
          </label>
          <textarea
            id="recorte-prompt"
            className={styles.textarea}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: Detectá si estoy gastando de más en delivery y decime cuánto podría ahorrar."
            rows={4}
            autoFocus
          />

          {suggestions.length > 0 && (
            <div className={styles.suggestions}>
              <p className={styles.suggTitle}>Sugerencias para empezar</p>
              <div className={styles.suggList}>
                {suggestions.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={styles.suggChip}
                    onClick={() => applyTemplate(t)}
                  >
                    <span aria-hidden>{t.icon}</span> {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {draftMutation.isError && (
            <p className={styles.error}>No se pudo procesar. Revisá tu conexión o la API key.</p>
          )}

          <div className={styles.actions}>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={() => void handleProcess()}
              loading={draftMutation.isPending}
              disabled={prompt.trim().length < 8}
            >
              Procesar
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.body}>
          <div className={styles.previewHead}>
            <span className={styles.previewIcon} style={{ background: draft.color }} aria-hidden>
              {draft.icon}
            </span>
            <div className={styles.previewMeta}>
              <span className={styles.previewName}>{draft.name || 'Nuevo recorte'}</span>
              {draft.description && (
                <span className={styles.previewDesc}>{draft.description}</span>
              )}
            </div>
          </div>

          <label className={styles.label} htmlFor="recorte-name">Nombre</label>
          <input
            id="recorte-name"
            className={styles.input}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />

          <label className={styles.label} htmlFor="recorte-desc">Descripción</label>
          <textarea
            id="recorte-desc"
            className={styles.textarea}
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            rows={2}
          />

          {/* Ícono: grilla de presets + emoji libre como última opción */}
          <label className={styles.label}>Ícono</label>
          <div className={styles.iconPicker} role="group" aria-label="Seleccionar ícono">
            {ICON_OPTIONS.map((ico) => (
              <button
                key={ico}
                type="button"
                className={[styles.icoBtn, draft.icon === ico ? styles.icoBtnActive : ''].join(' ')}
                onClick={() => setDraft({ ...draft, icon: ico })}
                aria-label={ico}
                aria-pressed={draft.icon === ico}
              >
                {ico}
              </button>
            ))}
            <input
              className={styles.icoCustom}
              value={ICON_OPTIONS.includes(draft.icon) ? '' : draft.icon}
              onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
              placeholder="✏️"
              aria-label="Emoji personalizado"
              maxLength={2}
            />
          </div>

          {/* Color: grilla de presets + selector custom como última opción */}
          <label className={styles.label}>Color</label>
          <div className={styles.colorPicker} role="group" aria-label="Seleccionar color">
            {COLOR_OPTIONS.map((col) => (
              <button
                key={col}
                type="button"
                className={[styles.colorBtn, draft.color === col ? styles.colorBtnActive : ''].join(' ')}
                style={{ background: col, '--swatch-color': col } as React.CSSProperties}
                onClick={() => setDraft({ ...draft, color: col })}
                aria-label={col}
                aria-pressed={draft.color === col}
              />
            ))}
            <input
              type="color"
              className={styles.colorCustom}
              value={draft.color}
              onChange={(e) => setDraft({ ...draft, color: e.target.value })}
              aria-label="Color personalizado"
            />
          </div>

          <label className={styles.label} htmlFor="recorte-prompt-edit">Prompt</label>
          <textarea
            id="recorte-prompt-edit"
            className={styles.textarea}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
          />

          <label className={styles.label}>Formato de salida</label>
          <div className={styles.formatGrid}>
            {OUTPUT_FORMATS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={[styles.formatCard, draft.outputFormat === f.value ? styles.formatActive : ''].join(' ')}
                onClick={() => setDraft({ ...draft, outputFormat: f.value })}
              >
                <span className={styles.formatIcon} aria-hidden>{f.icon}</span>
                <span className={styles.formatLabel}>{f.label}</span>
                <span className={styles.formatHint}>{f.hint}</span>
              </button>
            ))}
          </div>

          <label className={styles.label}>
            Categorías <span className={styles.labelHint}>· vacío = todas</span>
          </label>
          <div className={styles.catPicker} role="group" aria-label="Acotar categorías">
            {(categories ?? [])
              .filter((c) => c.active)
              .map((c) => {
                const on = draft.categoryIds.includes(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={[styles.catChip, on ? styles.catChipActive : ''].join(' ')}
                    style={on && c.color ? { borderColor: c.color, background: `${c.color}18` } : undefined}
                    onClick={() => toggleCategory(c.id)}
                    aria-pressed={on}
                  >
                    <span aria-hidden>{c.icon}</span> {c.name}
                  </button>
                )
              })}
          </div>

          <label className={styles.label}>Rango de gastos a analizar</label>
          <div className={styles.rangeModes} role="radiogroup" aria-label="Tipo de rango">
            <label className={styles.rangeMode}>
              <input
                type="radio"
                name="recorte-range-mode"
                checked={rangeMode === 'period'}
                onChange={() => setRangeMode('period')}
              />
              <span>Período predefinido</span>
            </label>
            <label className={styles.rangeMode}>
              <input
                type="radio"
                name="recorte-range-mode"
                checked={rangeMode === 'since'}
                onChange={() => setRangeMode('since')}
              />
              <span>Desde una fecha</span>
            </label>
          </div>

          {rangeMode === 'period' ? (
            <PeriodControl
              options={RECORTE_PERIODS}
              value={draft.period}
              onChange={(p) => setDraft({ ...draft, period: p })}
            />
          ) : (
            <input
              id="recorte-since"
              type="date"
              className={styles.dateInput}
              value={draft.sinceDate}
              onChange={(e) => setDraft({ ...draft, sinceDate: e.target.value })}
            />
          )}

          {saveError && (
            <p className={styles.error}>
              No se pudo {isEditing ? 'guardar' : 'crear'} el recorte. Intentá de nuevo.
            </p>
          )}

          <div className={styles.actions}>
            {isEditing ? (
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            ) : (
              <Button variant="ghost" onClick={() => setPhase('prompt')}>Volver</Button>
            )}
            <Button
              onClick={() => void handleSubmit()}
              loading={saving}
              disabled={draft.name.trim().length === 0}
            >
              {isEditing ? 'Guardar cambios' : 'Crear recorte'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
