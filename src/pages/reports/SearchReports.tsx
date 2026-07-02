import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { toDisplayDate } from '../../utils/dateEngine'
import { srNum, parseReportNumber } from '../../utils/reportNumber'

type Result = {
  id: string
  report_number: number
  report_date: string
  customer: { name: string }
}

export function SearchReports() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)

    const rn = parseReportNumber(query)
    const allResults: Result[] = []
    const seen = new Set<string>()

    if (rn !== null) {
      const { data } = await supabase
        .from('service_reports')
        .select('id, report_number, report_date, customer:customers(name)')
        .eq('report_number', rn)
      if (data) data.forEach(r => {
        if (!seen.has(r.id)) { seen.add(r.id); allResults.push(r as unknown as Result) }
      })
    }

    const { data: customers } = await supabase
      .from('customers')
      .select('id')
      .ilike('name', `%${query.trim()}%`)

    if (customers && customers.length > 0) {
      const { data } = await supabase
        .from('service_reports')
        .select('id, report_number, report_date, customer:customers(name)')
        .in('customer_id', customers.map(c => c.id))
        .order('report_number', { ascending: false })
      if (data) data.forEach(r => {
        if (!seen.has(r.id)) { seen.add(r.id); allResults.push(r as unknown as Result) }
      })
    }

    allResults.sort((a, b) => b.report_number - a.report_number)
    setResults(allResults)
    setLoading(false)
  }

  return (
    <Layout>
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">← Back</button>
          <h2 className="text-xl font-semibold text-gray-900">Search Reports</h2>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Customer name or SR-001"
            style={{ fontSize: '16px' }}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" disabled={loading}
            className="px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors">
            Search
          </button>
        </form>

        {loading ? (
          <p className="text-gray-400 text-sm">Searching...</p>
        ) : searched && results.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <p className="text-gray-500 text-sm">No reports found.</p>
          </div>
        ) : (
          <div className="space-y-2">
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
        )}
      </div>
    </Layout>
  )
}
