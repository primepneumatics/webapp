import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { toDisplayDate } from '../../utils/dateEngine'
import { srNum } from '../../utils/reportNumber'
import { downloadPdf } from '../../utils/downloadPdf'
import { Layout } from '../../components/Layout'

type Report = {
  id: string
  report_number: number
  report_date: string
  total_run_hours: number
  due_service_date: string | null
  serviced_by: string | null
}

export function ServiceReports() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [fabNumber, setFabNumber] = useState('')
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from('services').select('fab_number').eq('id', id).single().then(({ data }) => {
      if (data) setFabNumber(data.fab_number)
    })
  }, [id])

  useEffect(() => {
    let query = supabase
      .from('service_reports')
      .select('id, report_number, report_date, total_run_hours, due_service_date, serviced_by')
      .eq('service_id', id)
      .order('report_date', { ascending: false })

    if (from) query = query.gte('report_date', from)
    if (to) query = query.lte('report_date', to)

    query.then(({ data }) => {
      if (data) setReports(data)
      setLoading(false)
    })
  }, [id, from, to])

  async function handleDownload() {
    if (!printRef.current) return
    setDownloading(true)
    await downloadPdf(printRef.current, `${fabNumber || 'service'}-history.pdf`)
    setDownloading(false)
  }

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6 no-print">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/services/${id}`)} className="text-gray-400 hover:text-gray-600">
              ← Back
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Service History</h2>
              {fabNumber && <p className="text-sm text-gray-500 font-mono">{fabNumber}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {downloading ? 'Preparing PDF...' : 'Download PDF'}
            </button>
          </div>
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

        <div ref={printRef}>
          <div className="hidden print:block mb-6">
            <h1 className="text-lg font-bold text-gray-900">
              Prime Pneumatics — Service History: {fabNumber}
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
                      <div>
                        <span className="text-sm font-semibold text-gray-900">{toDisplayDate(r.report_date)}</span>
                        {r.report_number && <span className="ml-2 text-xs font-mono text-gray-400">{srNum(r.report_number)}</span>}
                      </div>
                      <Link to={`/reports/${r.id}`} className="text-xs text-blue-600 font-medium hover:underline">
                        View →
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <span className="text-gray-500">Total Run Hours</span>
                      <span className="text-gray-900 text-right">{r.total_run_hours}</span>
                      <span className="text-gray-500">Service By</span>
                      <span className="text-gray-900 text-right">{r.serviced_by || '—'}</span>
                      <span className="text-gray-500">Due Service Date</span>
                      <span className="text-gray-900 text-right">{r.due_service_date ? toDisplayDate(r.due_service_date) : '—'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table + print */}
              <div className="hidden sm:block print:block bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-4 py-3 font-medium text-gray-600">No.</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Report Date</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Total Run Hours</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Service By</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Due Service Date</th>
                      <th className="px-4 py-3 font-medium text-gray-600 no-print">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.report_number ? srNum(r.report_number) : '—'}</td>
                        <td className="px-4 py-3 text-gray-900">{toDisplayDate(r.report_date)}</td>
                        <td className="px-4 py-3 text-gray-600">{r.total_run_hours}</td>
                        <td className="px-4 py-3 text-gray-600">{r.serviced_by || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{r.due_service_date ? toDisplayDate(r.due_service_date) : '—'}</td>
                        <td className="px-4 py-3 no-print">
                          <Link to={`/reports/${r.id}`} className="text-blue-600 hover:underline text-xs">
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
