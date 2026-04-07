// src/pages/ExportDataPage/ExportDataPage.tsx
import React, { useState } from 'react'
import styles from './ExportDataPage.module.css'

type ExportFormat = 'csv' | 'pdf' | 'json'

interface RecentExport {
  name: string
  format: ExportFormat
  date: string
  size: string
}

const FORMAT_OPTIONS: { id: ExportFormat; label: string; desc: string; icon: string; color: string }[] = [
  { id: 'csv', label: 'Exportar como CSV', desc: 'Tabla de datos', icon: '📊', color: 'var(--g500)' },
  { id: 'pdf', label: 'Exportar como PDF', desc: 'Documento', icon: '📄', color: '#e74c3c' },
  { id: 'json', label: 'Exportar como JSON', desc: 'Código de datos', icon: '{ }', color: '#3b82f6' },
]

const RANGE_OPTIONS = ['Último mes', 'Últimos 3 meses', 'Último año', 'Todo']
const CURRENCY_OPTIONS = ['Todas', 'UYU', 'USD']
const INCLUDE_OPTIONS = ['Gastos + Ingresos', 'Solo gastos', 'Solo ingresos']

const MOCK_RECENT: RecentExport[] = [
  { name: 'gastos_marzo_2026.csv', format: 'csv', date: '15 Mar 2026', size: '2.4 MB' },
  { name: 'reporte_q1_2026.pdf', format: 'pdf', date: '01 Mar 2026', size: '1.8 MB' },
  { name: 'backup_completo.json', format: 'json', date: '28 Feb 2026', size: '5.2 MB' },
]

export default function ExportDataPage(): React.ReactElement {
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [range, setRange] = useState('Último mes')
  const [currency, setCurrency] = useState('Todas')
  const [include, setInclude] = useState('Gastos + Ingresos')

  function handleDownload(): void {
    // TODO: implementar descarga real
    alert(`Descargando ${format.toUpperCase()} — ${range}, ${currency}, ${include}`)
  }

  function handlePreview(): void {
    // TODO: implementar previsualización
    alert('Previsualización no disponible aún')
  }

  const formatIcon = (f: ExportFormat): string =>
    FORMAT_OPTIONS.find((o) => o.id === f)?.icon ?? '📄'

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Exportar Datos</h1>
        <p className={styles.subtitle}>Descargá tu información financiera en distintos formatos</p>
      </header>

      {/* Format cards */}
      <div className={styles.formatGrid}>
        {FORMAT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            className={`${styles.formatCard} ${format === opt.id ? styles.formatCardActive : ''}`}
            onClick={() => setFormat(opt.id)}
            type="button"
          >
            <span className={styles.formatIcon} style={{ color: opt.color }}>
              {opt.icon}
            </span>
            <span className={styles.formatLabel}>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Config section */}
      <section className={styles.configSection}>
        <h2 className={styles.configTitle}>Configurar exportación</h2>
        <div className={styles.configGrid}>
          <div className={styles.selectGroup}>
            <label className={styles.selectLabel}>Rango de fechas</label>
            <select
              className={styles.select}
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              {RANGE_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className={styles.selectGroup}>
            <label className={styles.selectLabel}>Moneda</label>
            <select
              className={styles.select}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCY_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className={styles.selectGroup}>
            <label className={styles.selectLabel}>Incluir</label>
            <select
              className={styles.select}
              value={include}
              onChange={(e) => setInclude(e.target.value)}
            >
              {INCLUDE_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action buttons */}
        <div className={styles.actions}>
          <button className={styles.downloadBtn} onClick={handleDownload} type="button">
            Descargar ahora
          </button>
          <button className={styles.previewBtn} onClick={handlePreview} type="button">
            Previsualizar
          </button>
        </div>
      </section>

      {/* Recent exports */}
      <section className={styles.recentSection}>
        <div className={styles.recentHeader}>
          <h2 className={styles.configTitle}>Exportaciones recientes</h2>
          <span className={styles.recentNote}>Se eliminan después de 30 días</span>
        </div>
        <div className={styles.recentList}>
          {MOCK_RECENT.map((item) => (
            <div key={item.name} className={styles.recentItem}>
              <span className={styles.recentIcon}>{formatIcon(item.format)}</span>
              <div className={styles.recentInfo}>
                <span className={styles.recentName}>{item.name}</span>
                <span className={styles.recentMeta}>{item.date} · {item.size}</span>
              </div>
              <button className={styles.recentDownload} type="button">
                Descargar
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
