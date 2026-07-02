import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { toDisplayDate, today } from '../../utils/dateEngine'
import { srNum, parseReportNumber } from '../../utils/reportNumber'
import { useAuth } from '../../hooks/useAuth'

type Result = {
  id: string
  report_number: number
  report_date: string
  customer: { name: string }
}

type Tab = 'customer' | 'report_no' | 'date'

export function SearchReports() {
  const { isAdmin, session } = useAuth()
  const [tab, setTab] = useState<Tab>('customer')
  const [customerQuery, setCustomerQuery] = useState('')
  const [reportNoQuery, setReportNoQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState(today())
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSearched(true)
    setResults([])

    if (tab === 'customer') {
      const q = customerQuery.trim()
      if (!q) { setLoading(false); return }
      const { data: customers } = await supabase
        .from('customers').select('id').ilike('name', `%${q}%`)
      if (customers && customers.length > 0) {
        let query = supabase
          .from('service_reports')
          .select('id, report_number, report_date, customer:customers(name)')
          .in('customer_id', customers.map(c => c.id))
          .order('report_number', { ascending: false })
        if (!isAdmin && session) query = query.eq('filed_by_id', session.user.id)
        const { data } = await query
        setResults((data as unknown as Result[]) ?? [])
      }
    }

    if (tab === 'report_no') {
      const rn = parseReportNumber(reportNoQuery)
      if (rn === null) { setLoading(false); return }
      const { data } = await supabase
        .from('service_reports')
        .select('id, report_number, report_date, customer:customers(name)')
        .eq('report_number', rn)
      setResults((data as unknown as Result[]) ?? [])
    }

    if (tab === 'date') {
      let query = supabase
        .from('service_reports')
        .select('id, report_number, report_date, customer:customers(name)')
        .order('report_number', { ascending: false })
      if (dateFrom) query = query.gte('report_date', dateFrom)
      if (dateTo) query = query.lte('report_date', dateTo)
      if (!isAdmin && session) query = query.eq('filed_by_id', session.user.id)
      const { data } = await query
      setResults((data as unknown as Result[]) ?? [])
    }

    setLoading(false)
  }

  function switchTab(t: Tab) {
    setTab(t)
    setResults([])
    setSearched(false)
  }

  return (
    <Layout>
      <div className="max-w-2xl">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Search Reports</h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {([
            { key: 'customer', label: 'Customer' },
            { key: 'report_no', label: 'Report No.' },
            { key: 'date', label: 'Date Range' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
          {tab === 'customer' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Customer Name</label>
              <input
                type="search"
                value={customerQuery}
                onChange={e => setCustomerQuery(e.target.value)}
                placeholder="e.g. Sharma Industries"
                style={{ fontSize: '16px' }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {tab === 'report_no' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Report Number</label>
              <input
                type="search"
                value={reportNoQuery}
                onChange={e => setReportNoQuery(e.target.value)}
                placeholder="e.g. SR-012 or 12"
                style={{ fontSize: '16px' }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {tab === 'date' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  style={{ fontSize: '16px' }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  style={{ fontSize: '16px' }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Results */}
        {searched && !loading && (
          results.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
              <p className="text-gray-500 text-sm">No reports found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 px-1 mb-2">{results.length} report{results.length !== 1 ? 's' : ''} found</p>
              {results.map(r => (
                <Link key={r.id} to={`/reports/${r.id}`}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.customer.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{toDisplayDate(r.report_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-semibold text-gray-600">{srNum(r.report_number)}</span>
                    <span className="text-gray-300 text-lg">›</span>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </div>
    </Layout>
  )
}
