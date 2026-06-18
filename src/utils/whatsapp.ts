export function toAuthEmail(phone: string): string {
  return `${phone}@prime.local`
}

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

export function generatePassword(): string {
  return Array.from({ length: 8 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
}

export function buildInviteLink(phone: string, password: string): string {
  const text = encodeURIComponent(
    `Your Prime Pneumatics login:\nPhone: ${phone}\nPassword: ${password}`
  )
  return `https://wa.me/${phone}?text=${text}`
}
