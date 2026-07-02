import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Layout } from '../components/Layout'
import { toISODate, toDisplayDate, startOfWeek, endOfWeek, today } from '../utils/dateEngine'
import { DEFAULT_REMINDER_TEMPLATE, buildReminderMessage, buildReminderLink } from '../utils/reminderTemplate'
import { normalizePhone } from '../utils/whatsapp'
import { srNum } from '../utils/reportNumber'

type DueService = {
  id: string
  report_number: number
  next_service_date: string
  report_date: string
  fab: string
  customer: {
    id: string
    name: string
    phone: string
    model: string
  }
}

type Tab = 'week' | 'pastdue'

export function Dashboard() {
  const [tab, setTab] = useState<Tab>('week')
  const [weekServices, setWeekServices] = useState<DueService[]>([])
  const [pastServices, setPastServices] = useState<DueService[]>([])
  const [loading, setLoading] = useState(true)
  const [template, setTemplate] = useState(DEFAULT_REMINDER_TEMPLATE)

  useEffect(() => {
    async function load() {
      const weekStart = toISODate(startOfWeek())
      const weekEnd = toISODate(endOfWeek())
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      const ninetyDaysAgoStr = toISODate(ninetyDaysAgo)

      const [{ data: weekData }, { data: pastData }, { data: settingData }] = await Promise.all([
        supabase
          .from('service_reports')
          .select('id, report_number, next_service_date, report_date, fab, customer:customers(id, name, phone, model)')
          .gte('next_service_date', weekStart)
          .lte('next_service_date', weekEnd)
          .order('next_service_date', { ascending: true }),
        supabase
          .from('service_reports')
          .select('id, report_number, next_service_date, report_date, fab, customer:customers(id, name, phone, model)')
          .gte('next_service_date', ninetyDaysAgoStr)
          .lt('next_service_date', weekStart)
          .order('next_service_date', { ascending: false }),
        supabase
          .from('settings')
          .select('value')
          .eq('key', 'reminder_template')
          .maybeSingle(),
      ])

      if (weekData) setWeekServices(weekData as unknown as DueService[])
      if (pastData) setPastServices(pastData as unknown as DueService[])
      if (settingData) setTemplate(settingData.value)
      setLoading(false)
    }
    load()
  }, [])

  const todayStr = today()
  const services = tab === 'week' ? weekServices : pastServices

  return (
    <Layout>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Services Due</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {tab === 'week'
            ? `${toDisplayDate(toISODate(startOfWeek()))} — ${toDisplayDate(toISODate(endOfWeek()))}`
            : 'Last 90 days before this week'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('week')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'week'
              ? 'bg-gray-900 text-white'
              : 'bg-white border border-gray-200 text-gray-600'
          }`}
        >
          This Week
          {!loading && weekServices.length > 0 && (
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              tab === 'week' ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-600'
            }`}>
              {weekServices.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('pastdue')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'pastdue'
              ? 'bg-red-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600'
          }`}
        >
          Past Due
          {!loading && pastServices.length > 0 && (
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              tab === 'pastdue' ? 'bg-white text-red-600' : 'bg-red-100 text-red-600'
            }`}>
              {pastServices.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : services.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <p className="text-gray-500 text-sm">
            {tab === 'week' ? 'No services due this week.' : 'No past due services in the last 90 days.'}
          </p>
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
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{s.customer.name}</p>
                    {s.report_number && <p className="text-xs font-mono text-gray-400">{srNum(s.report_number)}</p>}
                  </div>
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
                {s.customer.model && <p className="text-xs text-gray-500">{s.customer.model}</p>}
                <div className="flex flex-wrap gap-x-3 text-xs text-gray-400 mt-0.5 mb-3">
                  <span>Due: {toDisplayDate(s.next_service_date)}</span>
                  <span>Serviced: {toDisplayDate(s.report_date)}</span>
                  {s.fab && <span>FAB: {s.fab}</span>}
                </div>

                <div className="flex gap-2">
                  <a
                    href={`tel:${s.customer.phone}`}
                    className="flex-1 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-semibold text-center"
                  >
                    Call
                  </a>
                  <Link
                    to={`/reports/${s.id}`}
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
