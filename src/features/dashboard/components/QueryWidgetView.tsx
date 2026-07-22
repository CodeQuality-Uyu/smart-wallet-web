// src/features/dashboard/components/QueryWidgetView.tsx
//
// Renderer presentacional puro del engine QUERY. Recibe el QueryConfig y el
// QueryResult ya calculado (runQuery) y lo dibuja según el display elegido:
// número, tabla, o gráfica (recharts). El marco lo aporta WidgetShell.

import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  Tooltip,
} from 'recharts'
import type { PeriodFilter } from '@/types/enums'
import { QueryDisplay } from '@/types/enums'
import type { QueryConfig } from '@/types/models'
import { formatQueryValue, topGroups, type QueryResult } from '../queryEngine'
import { WidgetShell } from './WidgetShell'
import { ComparisonRow } from './GuidedWidgetView'
import styles from './QueryWidgetView.module.css'

const PIE_COLORS = ['#16a34a', '#3b82f6', '#f97316', '#8b5cf6', '#ef4444', '#14b8a6', '#ec4899', '#f5b732', '#6b7280']

export interface QueryWidgetViewProps {
  title: string
  icon?: string
  color?: string
  period?: PeriodFilter
  config: QueryConfig
  result: QueryResult
  action?: React.ReactNode
  dragHandle?: React.ReactNode
  className?: string
}

function ChartTooltip({
  active,
  payload,
  currency,
  aggregate,
}: {
  active?: boolean
  payload?: { name?: string; value?: number }[]
  currency: QueryResult['currency']
  aggregate: QueryResult['aggregate']
}): React.ReactElement | null {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className={styles.tooltip}>
      {p?.name ? <span className={styles.tooltipName}>{p.name}</span> : null}
      <span className={styles.tooltipVal}>{formatQueryValue(p?.value ?? 0, currency, aggregate)}</span>
    </div>
  )
}

export function QueryWidgetView({
  title,
  icon,
  color,
  period,
  config,
  result,
  action,
  dragHandle,
  className,
}: QueryWidgetViewProps): React.ReactElement {
  const accent = color || '#16a34a'
  const { display } = config
  const { groups, currency, aggregate, total, comparison } = result

  let body: React.ReactNode

  if (display === QueryDisplay.Value || display === QueryDisplay.ValueDelta) {
    body = (
      <div className={styles.valueBody}>
        <p className={styles.value}>{formatQueryValue(total, currency, aggregate)}</p>
        <span className={styles.valueCaption}>
          {result.count} {result.count === 1 ? 'gasto' : 'gastos'}
        </span>
        {display === QueryDisplay.ValueDelta && comparison && (
          <div className={styles.valueComparison}>
            <ComparisonRow c={comparison} />
          </div>
        )}
      </div>
    )
  } else if (display === QueryDisplay.Table) {
    body =
      groups.length === 0 ? (
        <p className={styles.empty}>Sin datos para mostrar.</p>
      ) : (
        <div className={styles.table}>
          {groups.map((g) => (
            <div key={g.key} className={styles.tableRow}>
              <span className={styles.tableLabel}>{g.label}</span>
              <span className={styles.tableVal}>{formatQueryValue(g.value, currency, aggregate)}</span>
            </div>
          ))}
        </div>
      )
  } else if (groups.length === 0) {
    body = <p className={styles.empty}>Sin datos para mostrar.</p>
  } else {
    const data = topGroups(groups, 8).map((g) => ({ name: g.label, value: g.value }))
    const tip = <Tooltip content={<ChartTooltip currency={currency} aggregate={aggregate} />} cursor={{ fill: 'rgba(0,0,0,.04)' }} />
    body = (
      <div className={styles.chart}>
        <ResponsiveContainer width="100%" height={150}>
          {display === QueryDisplay.Bar ? (
            <BarChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9ca3af' }} interval={0} tickLine={false} axisLine={false} />
              {tip}
              <Bar dataKey="value" fill={accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : display === QueryDisplay.Line ? (
            <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 4 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9ca3af' }} interval="preserveStartEnd" tickLine={false} axisLine={false} />
              {tip}
              <Line type="monotone" dataKey="value" stroke={accent} strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          ) : display === QueryDisplay.Area ? (
            <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 4 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9ca3af' }} interval="preserveStartEnd" tickLine={false} axisLine={false} />
              {tip}
              <Area type="monotone" dataKey="value" stroke={accent} fill={accent} fillOpacity={0.18} strokeWidth={2} />
            </AreaChart>
          ) : (
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={58} innerRadius={30}>
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              {tip}
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <WidgetShell title={title} icon={icon} color={color} period={period} action={action} dragHandle={dragHandle} className={className}>
      {body}
    </WidgetShell>
  )
}
