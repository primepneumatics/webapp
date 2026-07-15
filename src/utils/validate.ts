export function alphanumericOnly(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '')
}

export function modelNumberChars(value: string): string {
  return value.replace(/[^a-zA-Z0-9. ]/g, '')
}
