// src/features/dashboard/components/GuidedWidgetView.tsx
//
// Componente presentacional puro de un widget guiado (sin fetch ni acciones).
// Lo usan el renderer del HomePage y el previsualizador del editor, para que la
// vista previa refleje exactamente cómo se verá el widget real.

import React from 'react'
import { Currency, WidgetComparisonRender } from '@/types/enums'
import type { PeriodFilter } from '@/types/enums'
import { formatAmountNoSymbol } from '@/utils/formatCurrency'
import type { GuidedBlock } from '@/types/models'
import { computeGuidedBlock, guidedSourceIcon, type WidgetComputeContext } from '../widgetValue'
import { WidgetShell } from './WidgetShell'
import styles from './GuidedWidgetView.module.css'

function symbolFor(currency: Currency): string {
  return currency === Currency.USD ? 'U$S' : '$'
}

function Sparkline({ series }: { series: number[] }): React.ReactElement | null {
  if (series.length === 0) return null
  const max = Math.max(...series, 1)
  return (
    <div className={styles.sparkline} aria-hidden>
      {series.map((v, i) => (
        <div
          key={i}
          className={[styles.sparkBar, i === series.length - 1 ? styles.sparkBarLast : ''].join(' ')}
          style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  )
}

export interface ComparisonData {
  render: WidgetComparisonRender
  label: string
  deltaPct?: number
  ratioPct?: number
  caption: string
}

export function ComparisonRow({ c }: { c: ComparisonData }): React.ReactElement {
  if (c.render === WidgetComparisonRender.Progress) {
    const pct = c.ratioPct ?? 0
    const level = pct >= 90 ? styles.progDanger : pct >= 70 ? styles.progWarn : styles.progOk
    return (
      <div className={styles.progWrap}>
        <div className={styles.progHead}>
          <span className={styles.cmpTag}>{c.label}</span>
          <span className={styles.progLabel}>
            {pct}% {c.caption}
          </span>
        </div>
        <div className={styles.progTrack}>
          <div className={[styles.progFill, level].join(' ')} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>
    )
  }
  const delta = c.deltaPct ?? 0
  const dir = delta > 0 ? styles.deltaUp : delta < 0 ? styles.deltaDown : styles.deltaFlat
  return (
    <div className={styles.deltaRow}>
      <span className={styles.cmpTag}>{c.label}</span>
      <div className={[styles.delta, dir].join(' ')}>
        {delta > 0 ? '↑' : delta < 0 ? '↓' : '='}
        {Math.abs(delta)}%{c.caption && <span className={styles.deltaCaption}> {c.caption}</span>}
      </div>
    </div>
  )
}

function BlockView({
  block,
  ctx,
  showLabel,
}: {
  block: GuidedBlock
  ctx: WidgetComputeContext
  showLabel: boolean
}): React.ReactElement {
  const { amount, currency, sparkline, comparisons } = computeGuidedBlock(block, ctx)
  return (
    <div className={styles.block}>
      {showLabel && (
        <span className={styles.blockLabel}>
          {block.icon || guidedSourceIcon(block.metric.source)} {block.label || ''}
        </span>
      )}
      <div className={styles.valueRow}>
        <p className={styles.value}>
          {amount == null ? (
            <span className={styles.valueEmpty}>–</span>
          ) : (
            <>
              <span className={styles.valueSymbol}>{symbolFor(currency)} </span>
              {formatAmountNoSymbol(amount, currency)}
            </>
          )}
        </p>
        {sparkline && sparkline.length > 0 && <Sparkline series={sparkline} />}
      </div>
      {comparisons.length > 0 && (
        <div className={styles.comparisons}>
          {comparisons.map((c, i) => (
            <ComparisonRow key={i} c={c} />
          ))}
        </div>
      )}
    </div>
  )
}

export interface GuidedWidgetViewProps {
  title: string
  icon?: string
  color?: string
  period?: PeriodFilter
  blocks: GuidedBlock[]
  ctx: WidgetComputeContext
  /** Acción en la esquina superior derecha (ej. menú kebab). */
  action?: React.ReactNode
  /** Manija de arrastre. */
  dragHandle?: React.ReactNode
  /** Clase extra en la card (ej. span de grilla, ancho de preview). */
  className?: string
}

export function GuidedWidgetView({
  title,
  icon,
  color,
  period,
  blocks,
  ctx,
  action,
  dragHandle,
  className,
}: GuidedWidgetViewProps): React.ReactElement {
  return (
    <WidgetShell title={title} icon={icon} color={color} period={period} action={action} dragHandle={dragHandle} className={className}>
      <div className={styles.blocks}>
        {blocks.map((b) => (
          <BlockView key={b.id} block={b} ctx={ctx} showLabel={blocks.length > 1} />
        ))}
      </div>
    </WidgetShell>
  )
}
