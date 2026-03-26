export interface MockSalary {
  id: string
  amount: number
  currency: string
  date: string
  notes: string
  createdAt: string
}

export const mockSalaries: MockSalary[] = [
  { id: 'sal-1', amount: 75000, currency: 'UYU', date: '2026-03-01', notes: 'Sueldo marzo', createdAt: '2026-03-01T00:00:00.000Z' },
  { id: 'sal-2', amount: 75000, currency: 'UYU', date: '2026-02-01', notes: 'Sueldo febrero', createdAt: '2026-02-01T00:00:00.000Z' },
  { id: 'sal-3', amount: 1200, currency: 'USD', date: '2026-03-01', notes: 'Freelance marzo', createdAt: '2026-03-01T00:00:00.000Z' },
]
