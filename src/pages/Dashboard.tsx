import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Layout } from '../components/Layout'
import { toISODate, toDisplayDate, startOfWeek, endOfWeek, today } from '../utils/dateEngine'
import { getReminderTemplate, buildReminderMessage, buildReminderLink } from '../utils/reminderTemplate'
import { normalizePhone } from '../utils/whatsapp'

type DueService = {
  id: string
  next_service_date: string
  customer: {
    id: string
    name: string
    phone: string
    model: string
  }
}

export function Dashboard() {
  const [services, setServices] = useState<DueService[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const weekStart = toISODate(startOfWeek())
      const weekEnd = toISODate(endOfWeek())

      const { data, error } = await supabase
        .from('service_reports')
        .select('id, next_service_date, customer:customers(id, name, phone, model)')
        .gte('next_service_date', weekStart)
        .lte('next_service_date', weekEnd)
        .order('next_service_date', { ascending: true })

      if (!error && data) {
        setServices(data as unknown as DueService[])
      }
      setLoading(false)
    }
    load()
  }, [])

  const todayStr = today()
  const template = getReminderTemplate()

  return (
    <Layout>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Services Due</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {toDisplayDate(toISODate(startOfWeek()))} &mdash; {toDisplayDate(toISODate(endOfWeek()))}
        </p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : services.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <p className="text-gray-500 text-sm">No services due this week.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map(s => {
            const isPastDue = s.next_service_date < todayStr
            const message = buildReminderMessage(template, {
              name: s.customer.name,
              model: s.customer.model || 'machine',
              date: toDisplayDate(s.next_service_date),
            })
            const reminderLink = buildReminderLink(normalizePhone(s.customer.phone), message)

            return (
              <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-1">
                  <p className="font-semibold text-gray-900 text-sm">{s.customer.name}</p>
                  {isPastDue ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 shrink-0 ml-2">
                      Past Due
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 shrink-0 ml-2">
                      Due
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{s.customer.model || '—'}</p>
                <p className="text-xs text-gray-400 mt-0.5 mb-3">Due: {toDisplayDate(s.next_service_date)}</p>

                <div className="flex gap-2">
                  <a
                    href={`tel:${s.customer.phone}`}
                    className="flex-1 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-semibold text-center"
                  >
                    Call
                  </a>
                  <Link
                    to={`/customers/${s.customer.id}`}
                    className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold text-center"
                  >
                    View
                  </Link>
                  <a
                    href={reminderLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 bg-amber-50 text-amber-700 rounded-lg text-xs font-semibold text-center"
                  >
                    Remind
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
