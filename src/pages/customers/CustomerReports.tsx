import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { toDisplayDate } from '../../utils/dateEngine'
import { Layout } from '../../components/Layout'

type Report = {
  id: string
  report_date: string
  fob: string
  hours_run: number
  spares_cost: number
  total_amount: number
  next_service_date: string
}

export function CustomerReports() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [customerName, setCustomerName] = useState('')
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    supabase.from('customers').select('name').eq('id', id).single().then(({ data }) => {
      if (data) setCustomerName(data.name)
    })
  }, [id])

  useEffect(() => {
    setLoading(true)
    let query = supabase
      .from('service_reports')
      .select('id, report_date, fob, hours_run, spares_cost, total_amount, next_service_date')
      .eq('customer_id', id)
      .order('report_date', { ascending: false })

    if (from) query = query.gte('report_date', from)
    if (to) query = query.lte('report_date', to)

    query.then(({ data }) => {
      if (data) setReports(data)
      setLoading(false)
    })
  }, [id, from, to])

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6 no-print">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/customers/${id}`)} className="text-gray-400 hover:text-gray-600">
              ← Back
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Service History</h2>
              {customerName && <p className="text-sm text-gray-500">{customerName}</p>}
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Print
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3 mb-4 no-print">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {(from || to) && (
            <button
              onClick={() => { setFrom(''); setTo('') }}
              className="px-3 py-2 text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg"
            >
              Clear
            </button>
          )}
        </div>

        <div>
          <div className="hidden print:block mb-6">
            <h1 className="text-lg font-bold text-gray-900">
              Prime Pneumatics — Service History: {customerName}
            </h1>
            {(from || to) && (
              <p className="text-sm text-gray-600 mt-1">
                Period: {from ? toDisplayDate(from) : '—'} to {to ? toDisplayDate(to) : '—'}
              </p>
            )}
          </div>

          {loading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : reports.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <p className="text-gray-500 text-sm">No reports found for this period.</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-3 sm:hidden no-print">
                {reports.map(r => (
                  <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-900">{toDisplayDate(r.report_date)}</span>
                      <Link
                        to={`/reports/${r.id}`}
                        className="text-xs text-blue-600 font-medium hover:underline"
                      >
                        View →
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <span className="text-gray-500">FAB</span>
                      <span className="text-gray-900 text-right">{r.fob || '—'}</span>
                      <span className="text-gray-500">Hours Run</span>
                      <span className="text-gray-900 text-right">{r.hours_run}</span>
                      <span className="text-gray-500">Subtotal</span>
                      <span className="text-gray-900 text-right">₹{r.spares_cost?.toFixed(2) ?? '0.00'}</span>
                      <span className="text-gray-500">Grand Total</span>
                      <span className="text-gray-900 text-right font-medium">₹{r.total_amount?.toFixed(2) ?? r.spares_cost?.toFixed(2) ?? '0.00'}</span>
                      <span className="text-gray-500">Next Service</span>
                      <span className="text-gray-900 text-right">{toDisplayDate(r.next_service_date)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table + print */}
              <div className="hidden sm:block print:block bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-4 py-3 font-medium text-gray-600">Report Date</th>
                      <th className="px-4 py-3 font-medium text-gray-600">FAB</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Hours Run</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Subtotal</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Grand Total</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Next Service</th>
                      <th className="px-4 py-3 font-medium text-gray-600 no-print">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900">{toDisplayDate(r.report_date)}</td>
                        <td className="px-4 py-3 text-gray-600">{r.fob || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{r.hours_run}</td>
                        <td className="px-4 py-3 text-gray-600">₹{r.spares_cost?.toFixed(2) ?? '0.00'}</td>
                        <td className="px-4 py-3 text-gray-900 font-medium">₹{r.total_amount?.toFixed(2) ?? r.spares_cost?.toFixed(2) ?? '0.00'}</td>
                        <td className="px-4 py-3 text-gray-600">{toDisplayDate(r.next_service_date)}</td>
                        <td className="px-4 py-3 no-print">
                          <Link
                            to={`/reports/${r.id}`}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
