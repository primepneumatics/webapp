export function calcNextServiceDate(reportDate: Date, hoursUntilNext: number): Date {
  const days = Math.floor(hoursUntilNext / 24)
  const next = new Date(reportDate)
  next.setDate(next.getDate() + days)
  return next
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function startOfWeek(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setDate(diff)
  return d
}

export function endOfWeek(): Date {
  const d = startOfWeek()
  d.setDate(d.getDate() + 6) // Sunday
  d.setHours(23, 59, 59, 999)
  return d
}

export function today(): string {
  return toISODate(new Date())
}

export function toDisplayDate(isoDate: string): string {
  if (!isoDate) return '—'
  const [y, m, d] = isoDate.split('-')
  return `${d}-${m}-${y}`
}
