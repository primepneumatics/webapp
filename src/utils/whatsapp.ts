export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '') // strip +, spaces, dashes
  if (digits.length === 10) return `91${digits}` // bare 10-digit → add country code
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}` // 0xxxxxxxxxx → 91xxxxxxxxxx
  return digits
}

export function toAuthEmail(phone: string): string {
  if (phone.includes('@')) return phone
  return `${phone}@prime.local`
}

export function stripAuthSuffix(email: string): string {
  return email.replace('@prime.local', '')
}

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

export function generatePassword(): string {
  return Array.from({ length: 8 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
}

export function displayPhone(phone: string): string {
  return phone.startsWith('91') && phone.length === 12 ? phone.slice(2) : phone
}

export function buildInviteLink(phone: string, password: string, loginUrl: string): string {
  const text = encodeURIComponent(
    `Your Prime Pneumatics login:\nURL: ${loginUrl}\nPhone: ${displayPhone(phone)}\nPassword: ${password}`
  )
  return `https://wa.me/${phone}?text=${text}`
}
