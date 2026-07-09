import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { useAuth } from '../../hooks/useAuth'

type Customer = {
  id: string
  name: string
  org: string
  phone: string
}

export function CustomerList() {
  const navigate = useNavigate()
  const { isAdmin, session, loading: authLoading } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (authLoading || !session) return

    supabase
      .from('customers')
      .select('id, name, org, phone')
      .order('org')
      .then(({ data }) => {
        if (data) setCustomers(data)
        setLoading(false)
      })
  }, [authLoading, session])

  const filtered = search.trim()
    ? customers.filter(c => {
        const q = search.toLowerCase()
        return (
          c.name?.toLowerCase().includes(q) ||
          c.org?.toLowerCase().includes(q) ||
          c.phone?.includes(q)
        )
      })
    : customers

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Customers</h2>
        {isAdmin && (
          <Link
            to="/customers/new"
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium"
          >
            + Add
          </Link>
        )}
      </div>

      <input
        type="search"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by company, name or phone..."
        className="w-full mb-4 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : customers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <p className="text-gray-500 text-sm">No customers yet.</p>
          {isAdmin && (
            <Link to="/customers/new" className="text-blue-600 text-sm mt-2 inline-block">
              Add your first customer &rarr;
            </Link>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <p className="text-gray-500 text-sm">No customers match "{search}".</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div
              key={c.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between active:bg-gray-50 cursor-pointer"
              onClick={() => navigate(`/customers/${c.id}`)}
            >
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{c.org || c.name}</p>
                {c.org && <p className="text-xs text-gray-500 truncate">{c.name}</p>}
                <p className="text-xs text-gray-400 mt-0.5">{c.phone}</p>
              </div>
              <span className="text-gray-300 text-xl ml-3 shrink-0">&#8250;</span>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
