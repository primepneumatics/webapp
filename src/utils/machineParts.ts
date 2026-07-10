export type PartState = { hours_run: number; next_hours: number; hours_per_day: number }

// remaining hours + calendar days remaining, frozen at the moment of calculation.
// days = remainingHours / hours_per_day: the fewer hours/day the machine runs,
// the longer it calendar-wise takes to burn through the remaining hours.
export function calcRemaining(part: PartState): { remainingHours: number; days: number } {
  const remainingHours = part.next_hours - part.hours_run
  const days = part.hours_per_day > 0 ? remainingHours / part.hours_per_day : 0
  return { remainingHours, days }
}

export function addDaysToDate(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + Math.ceil(days))
  return next
}
