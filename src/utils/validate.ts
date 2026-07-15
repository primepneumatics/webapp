export function alphanumericOnly(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '')
}

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10)
}

// One-off normalization for legacy data that may have a stored country code
// or trunk prefix (e.g. 91XXXXXXXXXX or 0XXXXXXXXXX) — keeps the last 10
// digits so the real subscriber number isn't truncated. Only use this to
// clean up a value loaded from storage, not for live typing (see phoneDigits).
export function stripPhonePrefix(value: string): string {
  const digits = value.replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}
