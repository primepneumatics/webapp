import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { useAuth } from '../../hooks/useAuth'
import { toDisplayDate } from '../../utils/dateEngine'
import { srNum, parseReportNumber } from '../../utils/reportNumber'

type Result = {
  id: string
  report_number: number
  report_date: string
  service: { fab_number: string; model_number: string | null; customer: { name: string; org: string | null } }
}

type MatchedCustomer = { id: string; name: string; org: string | null }

type Tab = 'customer' | 'fab' | 'report_no'

const SELECT_COLS = 'id, report_number, report_date, service:services(fab_number, model_number, customer:customers(name, org))'

export function SearchReports() {
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState<Tab>('customer')
  const [customerQuery, setCustomerQuery] = useState('')
  const [fabQuery, setFabQuery] = useState('')
  const [reportNoQuery, setReportNoQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [matchedCustomers, setMatchedCustomers] = useState<MatchedCustomer[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSearched(true)
    setResults([])
    setMatchedCustomers([])

    if (tab === 'customer') {
      const q = customerQuery.trim()
      if (!q) { setLoading(false); return }
      const { data: customers } = await supabase
        .from('customers').select('id, name, org').ilike('org', `%${q}%`)
      setMatchedCustomers(customers ?? [])
      if (customers && customers.length > 0) {
        const { data: services } = await supabase
          .from('services').select('id').in('customer_id', customers.map(c => c.id))
        if (services && services.length > 0) {
          const { data } = await supabase
            .from('service_reports')
            .select(SELECT_COLS)
            .in('service_id', services.map(s => s.id))
            .order('report_number', { ascending: false })
          setResults((data as unknown as Result[]) ?? [])
        }
      }
    }

    if (tab === 'fab') {
      const q = fabQuery.trim()
      if (!q) { setLoading(false); return }
      const { data: services } = await supabase
        .from('services').select('id').ilike('fab_number', `%${q}%`)
      if (services && services.length > 0) {
        const { data } = await supabase
          .from('service_reports')
          .select(SELECT_COLS)
          .in('service_id', services.map(s => s.id))
          .order('report_number', { ascending: false })
        setResults((data as unknown as Result[]) ?? [])
      }
    }

    if (tab === 'report_no') {
      const rn = parseReportNumber(reportNoQuery)
      if (rn === null) { setLoading(false); return }
      const { data } = await supabase
        .from('service_reports')
        .select(SELECT_COLS)
        .eq('report_number', rn)
      setResults((data as unknown as Result[]) ?? [])
    }

    setLoading(false)
  }

  function switchTab(t: Tab) {
    setTab(t)
    setResults([])
    setMatchedCustomers([])
    setSearched(false)
  }

  return (
    <Layout>
      <div className="max-w-2xl">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Search Reports</h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {([
            { key: 'customer', label: 'Company' },
            { key: 'fab', label: 'FAB Number' },
            { key: 'report_no', label: 'Report No.' },
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
              <label className="block text-xs text-gray-500 mb-1">Company Name</label>
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

          {tab === 'fab' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">FAB Number</label>
              <input
                type="search"
                value={fabQuery}
                onChange={e => setFabQuery(e.target.value)}
                placeholder="e.g. FAB2K91A"
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
          tab === 'customer' && matchedCustomers.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
              <p className="text-gray-500 text-sm mb-4">No customer found matching &ldquo;{customerQuery.trim()}&rdquo;.</p>
              {isAdmin ? (
                <Link to={`/customers/new?org=${encodeURIComponent(customerQuery.trim())}`}
                  className="inline-block px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                  + Add New Customer
                </Link>
              ) : (
                <p className="text-xs text-gray-400">Ask an admin to add this customer.</p>
              )}
            </div>
          ) : results.length === 0 ? (
            tab === 'customer' && matchedCustomers.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 px-1 mb-2">No reports found, but this customer exists</p>
                {matchedCustomers.map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.org || c.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">No reports filed yet</p>
                    </div>
                    <Link to={`/reports/new/${c.id}`}
                      className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors whitespace-nowrap">
                      File First Report
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
                <p className="text-gray-500 text-sm">No reports found.</p>
              </div>
            )
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 px-1 mb-2">{results.length} report{results.length !== 1 ? 's' : ''} found</p>
              {results.map(r => (
                <Link key={r.id} to={`/reports/${r.id}`}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.service.customer.org || r.service.customer.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{r.service.fab_number}{r.service.model_number ? ` · ${r.service.model_number}` : ''}</p>
                    <p className="text-xs text-gray-400">{toDisplayDate(r.report_date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-semibold text-gray-600">{srNum(r.report_number)}</span>
                    <span className="text-xs font-medium text-blue-600">View ›</span>
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
