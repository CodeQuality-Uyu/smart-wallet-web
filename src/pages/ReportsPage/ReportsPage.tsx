// src/pages/ReportsPage.tsx
import React, { useState, useMemo } from 'react'
import { useMetrics } from '@/hooks/useMetrics'
import { useBudget } from '@/hooks/useBudget'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useProductCategories } from '@/features/products/hooks/useProductCategories'
import { useExpenses } from '@/features/expenses/hooks/useExpenses'
import { usePlaces } from '@/features/places/hooks/usePlaces'
import { useReportAttachments, useUploadReportAttachment, useRemoveReportAttachment } from '@/hooks/useReportAttachments'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatAmount } from '@/utils/formatCurrency'
import { Currency, PeriodFilter } from '@/types/enums'
import styles from './ReportsPage.module.css'

const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function ReportsPage(): React.ReactElement {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()) // 0-indexed

  const selectedYearMonth = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`
  const { data: metrics, isLoading } = useMetrics(PeriodFilter.Month, selectedYearMonth)
  const { data: budget } = useBudget()
  const { data: categories } = useCategories()
  const { data: productCategories } = useProductCategories()
  const { data: expensesData } = useExpenses()
  const { data: places } = usePlaces()
  const { data: attachments = [] } = useReportAttachments(selectedYearMonth)
  const uploadAttachment = useUploadReportAttachment(selectedYearMonth)
  const removeAttachment = useRemoveReportAttachment(selectedYearMonth)

  const sortedCategories = useMemo(() => {
    if (!metrics?.byCategory) return []
    return [...metrics.byCategory].sort((a, b) => (b.uyu + b.usd) - (a.uyu + a.usd))
  }, [metrics?.byCategory])

  const sortedProductCategories = useMemo(() => {
    if (!metrics?.byProductCategory) return []
    return [...metrics.byProductCategory].sort((a, b) => (b.uyu + b.usd) - (a.uyu + a.usd))
  }, [metrics?.byProductCategory])

  const sortedByPlace = useMemo(() => {
    const expenses = (expensesData?.data ?? []).filter((exp) => {
      const d = new Date(exp.date)
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
    })
    const map = new Map<string, { placeId: string; uyu: number; usd: number }>()
    for (const exp of expenses) {
      if (!exp.placeId) continue
      const entry = map.get(exp.placeId) ?? { placeId: exp.placeId, uyu: 0, usd: 0 }
      if (exp.currency === Currency.UYU) entry.uyu += exp.amount
      else if (exp.currency === Currency.USD) entry.usd += exp.amount
      map.set(exp.placeId, entry)
    }
    return [...map.values()].sort((a, b) => (b.uyu + b.usd) - (a.uyu + a.usd))
  }, [expensesData, selectedYear, selectedMonth])

  if (isLoading) return <LoadingSpinner fullPage />

  // Build 6 visible month pills (ending at current month)
  const visibleMonths: { month: number; year: number; id: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    visibleMonths.push({ month: d.getMonth(), year: d.getFullYear(), id: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })
  }

  const yearsInPills = new Set(visibleMonths.map((m) => m.year))
  const showYearInPills = yearsInPills.size > 1

  const maxCatUyu = Math.max(...sortedCategories.map((c) => c.uyu), 1)
  const maxCatUsd = Math.max(...sortedCategories.map((c) => c.usd), 1)

  const totalUyu = metrics?.totalUyu ?? 0
  const totalUsd = metrics?.totalUsd ?? 0
  const incomeUyu = budget?.uyu ?? 0
  const savedUyu = Math.max(0, incomeUyu - totalUyu)

  function formatSize(bytes: number): string {
    if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`
    return `${Math.round(bytes / 1_000)} KB`
  }

  function fileIcon(mimeType: string): string {
    if (mimeType === 'application/pdf') return '📄'
    if (mimeType.startsWith('image/')) return '🖼️'
    return '📎'
  }

  function prevMonth() {
    const d = new Date(selectedYear, selectedMonth - 1, 1)
    setSelectedYear(d.getFullYear())
    setSelectedMonth(d.getMonth())
  }
  function nextMonth() {
    const d = new Date(selectedYear, selectedMonth + 1, 1)
    if (d <= now) {
      setSelectedYear(d.getFullYear())
      setSelectedMonth(d.getMonth())
    }
  }

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.desktopHeader}>
        <div>
          <h1 className={styles.desktopTitle}>Reportes mensuales</h1>
          <p className={styles.desktopSubtitle}>Mirá el resumen de gastos de cada mes</p>
        </div>
        <button className={styles.exportBtn}>Exportar PDF</button>
      </div>

      {/* ── Month selector ── */}
      <div className={styles.monthSelector}>
        <button className={styles.navArrow} onClick={prevMonth}>‹</button>
        <div className={styles.monthPills}>
          {visibleMonths.map((m) => (
            <button
              key={m.id}
              className={`${styles.monthPill} ${m.month === selectedMonth && m.year === selectedYear ? styles.monthPillActive : ''}`}
              onClick={() => { setSelectedYear(m.year); setSelectedMonth(m.month) }}
            >
              {MONTH_SHORT[m.month]}
              {showYearInPills && <span className={styles.monthPillYear}>{m.year}</span>}
            </button>
          ))}
        </div>
        <button
          className={styles.navArrow}
          onClick={nextMonth}
          disabled={selectedMonth === now.getMonth() && selectedYear === now.getFullYear()}
        >›</button>
      </div>

      {/* ── Stat cards ── */}
      <div className={styles.statRow}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total gastado en UYU</p>
          <p className={styles.statValue}>{formatAmount(totalUyu, Currency.UYU)}</p>
          <span className={styles.statBadge}>UYU</span>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total gastado en USD</p>
          <p className={styles.statValue}>{formatAmount(totalUsd, Currency.USD)}</p>
          <span className={styles.statBadgeGold}>USD</span>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total ahorrado</p>
          <p className={`${styles.statValue} ${styles.statValueGreen}`}>{formatAmount(savedUyu, Currency.UYU)}</p>
        </div>
      </div>

      {/* ── Gasto por categoría ── */}
      <div className={styles.chartCard}>
        <p className={styles.chartTitle}>Gasto por categoría</p>
        {sortedCategories.length === 0 ? (
          <div className={styles.chartPlaceholder}>
            <span className={styles.chartPlaceholderText}>Sin datos de categorías para este mes</span>
          </div>
        ) : (
          <div className={styles.catList}>
            {sortedCategories.map((cat) => {
              const catColor = categories?.find((c) => c.id === cat.categoryId)?.color ?? 'var(--g500)'
              return (
                <div key={cat.categoryId} className={styles.catRow}>
                  <span className={styles.catName}>{cat.categoryIcon} {cat.categoryName}</span>
                  <div className={styles.catBars}>
                    <div className={styles.catBarRow}>
                      <div className={styles.catBar}>
                        <div className={styles.catBarFill} style={{ width: `${Math.round((cat.uyu / maxCatUyu) * 100)}%`, background: catColor }} />
                      </div>
                      <span className={styles.catAmt}>{formatAmount(cat.uyu, Currency.UYU)}</span>
                      <span className={styles.catCurBadge}>UYU</span>
                    </div>
                    <div className={styles.catBarRow}>
                      <div className={styles.catBar}>
                        <div className={styles.catBarFill} style={{ width: `${Math.round((cat.usd / maxCatUsd) * 100)}%`, background: catColor }} />
                      </div>
                      <span className={styles.catAmt}>{formatAmount(cat.usd, Currency.USD)}</span>
                      <span className={styles.catCurBadge}>USD</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Gasto por producto ── */}
      <div className={styles.chartCard}>
        <p className={styles.chartTitle}>Gasto por producto</p>
        {sortedProductCategories.length === 0 ? (
          <div className={styles.chartPlaceholder}>
            <span className={styles.chartPlaceholderText}>Sin datos de productos para este mes</span>
          </div>
        ) : (
          <div className={styles.catList}>
            {(() => {
              const maxPcUyu = Math.max(...sortedProductCategories.map((c) => c.uyu), 1)
              const maxPcUsd = Math.max(...sortedProductCategories.map((c) => c.usd), 1)
              return sortedProductCategories.map((pcat) => {
                const pcatColor = productCategories?.find((c) => c.id === pcat.productCategoryId)?.color ?? 'var(--g500)'
                return (
                  <div key={pcat.productCategoryId} className={styles.catRow}>
                    <span className={styles.catName}>{pcat.productCategoryIcon} {pcat.productCategoryName}</span>
                    <div className={styles.catBars}>
                      <div className={styles.catBarRow}>
                        <div className={styles.catBar}>
                          <div className={styles.catBarFill} style={{ width: `${Math.round((pcat.uyu / maxPcUyu) * 100)}%`, background: pcatColor }} />
                        </div>
                        <span className={styles.catAmt}>{formatAmount(pcat.uyu, Currency.UYU)}</span>
                        <span className={styles.catCurBadge}>UYU</span>
                      </div>
                      <div className={styles.catBarRow}>
                        <div className={styles.catBar}>
                          <div className={styles.catBarFill} style={{ width: `${Math.round((pcat.usd / maxPcUsd) * 100)}%`, background: pcatColor }} />
                        </div>
                        <span className={styles.catAmt}>{formatAmount(pcat.usd, Currency.USD)}</span>
                        <span className={styles.catCurBadge}>USD</span>
                      </div>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        )}
      </div>

      {/* ── Gasto por local ── */}
      <div className={styles.chartCard}>
        <p className={styles.chartTitle}>Gasto por local</p>
        {sortedByPlace.length === 0 ? (
          <div className={styles.chartPlaceholder}>
            <span className={styles.chartPlaceholderText}>Sin datos de locales para este mes</span>
          </div>
        ) : (
          <div className={styles.catList}>
            {(() => {
              const maxPlUyu = Math.max(...sortedByPlace.map((c) => c.uyu), 1)
              const maxPlUsd = Math.max(...sortedByPlace.map((c) => c.usd), 1)
              return sortedByPlace.map((pl) => {
                const place = places?.find((p) => p.id === pl.placeId)
                return (
                  <div key={pl.placeId} className={styles.catRow}>
                    <span className={styles.catName}>{place?.icon ?? '📍'} {place?.name ?? 'Sin local'}</span>
                    <div className={styles.catBars}>
                      <div className={styles.catBarRow}>
                        <div className={styles.catBar}>
                          <div className={styles.catBarFill} style={{ width: `${Math.round((pl.uyu / maxPlUyu) * 100)}%`, background: 'var(--g500)' }} />
                        </div>
                        <span className={styles.catAmt}>{formatAmount(pl.uyu, Currency.UYU)}</span>
                        <span className={styles.catCurBadge}>UYU</span>
                      </div>
                      <div className={styles.catBarRow}>
                        <div className={styles.catBar}>
                          <div className={styles.catBarFill} style={{ width: `${Math.round((pl.usd / maxPlUsd) * 100)}%`, background: 'var(--g500)' }} />
                        </div>
                        <span className={styles.catAmt}>{formatAmount(pl.usd, Currency.USD)}</span>
                        <span className={styles.catCurBadge}>USD</span>
                      </div>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        )}
      </div>

      {/* ── Documentos del mes ── */}
      <div className={styles.attachmentsCard}>
        <div className={styles.attachmentsHeader}>
          <p className={styles.chartTitle} style={{ marginBottom: 0 }}>Documentos del mes</p>
          <label className={styles.uploadBtn}>
            {uploadAttachment.isPending ? 'Subiendo…' : '＋ Subir archivo'}
            <input
              type="file"
              accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp"
              multiple
              style={{ display: 'none' }}
              disabled={uploadAttachment.isPending}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? [])
                files.forEach((f) => uploadAttachment.mutate(f))
                e.target.value = ''
              }}
            />
          </label>
        </div>

        {attachments.length === 0 ? (
          <div className={styles.attachmentsEmpty}>
            <span className={styles.attachmentsEmptyIcon}>📂</span>
            <p>No hay documentos subidos para este mes.</p>
            <p className={styles.attachmentsEmptyHint}>Podés subir estados de cuenta, comprobantes o cualquier archivo relevante.</p>
          </div>
        ) : (
          <div className={styles.attachmentsList}>
            {attachments.map((att) => (
              <div key={att.id} className={styles.attachmentRow}>
                <span className={styles.attachmentIcon}>{fileIcon(att.mimeType)}</span>
                <div className={styles.attachmentInfo}>
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.attachmentName}
                  >
                    {att.name}
                  </a>
                  <span className={styles.attachmentMeta}>
                    {formatSize(att.size)} · {new Date(att.uploadedAt).toLocaleDateString('es-UY', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <button
                  className={styles.attachmentRemove}
                  onClick={() => removeAttachment.mutate(att.id)}
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
