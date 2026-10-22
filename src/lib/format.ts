import type { Currency } from '@/types/database'

const LOCALE = 'sr-Latn-RS'

export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' }).format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

/** 'YYYY-MM-DD' (lokalno) iz ISO stringa ili Date-a. */
export function toDateInput(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 'YYYY-MM-DD' -> ISO u 09:00 lokalno. */
export function dateInputToIso(value: string): string {
  return new Date(`${value}T09:00:00`).toISOString()
}

export function endOfToday(): Date {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}
