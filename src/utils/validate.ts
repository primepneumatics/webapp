export function alphanumericOnly(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '')
}

export function modelNumberChars(value: string): string {
  return value.replace(/[^a-zA-Z0-9. ]/g, '')
}

export function phoneDigits(value: string): string {
  const digits = value.replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}
