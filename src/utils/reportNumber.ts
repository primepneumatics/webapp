export function srNum(n: number): string {
  return `SR-${String(n).padStart(3, '0')}`
}

export function parseReportNumber(q: string): number | null {
  const match = q.trim().match(/^(?:SR-?)?(\d+)$/i)
  return match ? parseInt(match[1], 10) : null
}
