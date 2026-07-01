export const DEFAULT_REMINDER_TEMPLATE =
  'Dear {name}, your {model} is due for service on {date}. Kindly contact Prime Pneumatics to schedule your appointment.'

export function buildReminderMessage(
  template: string,
  data: { name: string; model: string; date: string }
): string {
  return template
    .replace(/{name}/g, data.name)
    .replace(/{model}/g, data.model)
    .replace(/{date}/g, data.date)
}

export function buildReminderLink(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
