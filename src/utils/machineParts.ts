export type PartState = { hours_run: number; next_hours: number; hours_per_day: 12 | 24 }

// remaining hours + calendar days remaining, frozen at the moment of calculation.
// 24h/day is the baseline; 12h/day doubles the calendar days needed since the
// machine burns through hours at half the rate.
export function calcRemaining(part: PartState): { remainingHours: number; days: number } {
  const remainingHours = part.next_hours - part.hours_run
  const baselineDays = remainingHours / 24
  const days = part.hours_per_day === 12 ? baselineDays * 2 : baselineDays
  return { remainingHours, days }
}

export function addDaysToDate(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + Math.ceil(days))
  return next
}
