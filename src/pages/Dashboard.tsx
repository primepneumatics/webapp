import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Layout } from '../components/Layout'
import { toISODate, startOfWeek, endOfWeek, today } from '../utils/dateEngine'

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
      const weekEnd = toISODate(endOfWeek())

      const { data, error } = await supabase
        .from('service_reports')
        .select('id, next_service_date, customer:customers(id, name, phone, model)')
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

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Services Due This Week</h2>
        <p className="text-sm text-gray-500 mt-1">
          Week of {toISODate(startOfWeek())} — {toISODate(endOfWeek())}
        </p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : services.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">No services due this week.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Customer</th>
                <th className="px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="px-4 py-3 font-medium text-gray-600">Model</th>
                <th className="px-4 py-3 font-medium text-gray-600">Due Date</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map(s => {
                const isPastDue = s.next_service_date < todayStr
                return (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.customer.name}</td>
                    <td className="px-4 py-3 text-gray-600">{s.customer.phone}</td>
                    <td className="px-4 py-3 text-gray-600">{s.customer.model || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.next_service_date}</td>
                    <td className="px-4 py-3">
                      {isPastDue ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Past Due
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Due
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${s.customer.phone}`}
                          className="px-2.5 py-1 bg-green-50 text-green-700 rounded-md text-xs font-medium hover:bg-green-100"
                        >
                          Call
                        </a>
                        <Link
                          to={`/customers/${s.customer.id}`}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-100"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
