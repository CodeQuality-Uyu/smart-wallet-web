// src/tests/mocks/data/reportAttachments.ts

import type { ReportAttachment } from '@/types/models'

export const mockReportAttachments: ReportAttachment[] = [
  {
    id: 'att-1',
    yearMonth: '2026-04',
    name: 'Estado de cuenta Visa Abril.pdf',
    url: 'https://example.com/mock/estado-visa-abril.pdf',
    mimeType: 'application/pdf',
    size: 245000,
    uploadedAt: '2026-04-05T10:00:00Z',
  },
  {
    id: 'att-2',
    yearMonth: '2026-04',
    name: 'Comprobante transferencia.jpg',
    url: 'https://example.com/mock/comprobante.jpg',
    mimeType: 'image/jpeg',
    size: 128000,
    uploadedAt: '2026-04-06T14:30:00Z',
  },
]
