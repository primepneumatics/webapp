import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'

type Customer = {
  id: string
  name: string
  org: string
  phone: string
  model: string
}

export function CustomerList() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('customers')
      .select('id, name, org, phone, model')
      .order('name')
      .then(({ data }) => {
        if (data) setCustomers(data)
        setLoading(false)
      })
  }, [])

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Customers</h2>
        <Link
          to="/customers/new"
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium"
        >
          + Add
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : customers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <p className="text-gray-500 text-sm">No customers yet.</p>
          <Link to="/customers/new" className="text-blue-600 text-sm mt-2 inline-block">
            Add your first customer &rarr;
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map(c => (
            <div
              key={c.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between active:bg-gray-50 cursor-pointer"
              onClick={() => navigate(`/customers/${c.id}`)}
            >
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{c.name}</p>
                {c.org && <p className="text-xs text-gray-500 truncate">{c.org}</p>}
                <p className="text-xs text-gray-400 mt-0.5">
                  {c.phone}{c.model ? ` · ${c.model}` : ''}
                </p>
              </div>
              <span className="text-gray-300 text-xl ml-3 shrink-0">&#8250;</span>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
