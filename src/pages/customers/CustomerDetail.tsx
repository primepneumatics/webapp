import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { useAuth } from '../../hooks/useAuth'

type Customer = {
  id: string
  gst: string
  name: string
  org: string
  address: string
  phone: string
  model: string
  spares: string
}

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setCustomer(data)
        setLoading(false)
      })
  }, [id])

  if (loading) return <Layout><p className="text-gray-400 text-sm">Loading...</p></Layout>
  if (!customer) return <Layout><p className="text-red-500 text-sm">Customer not found.</p></Layout>

  return (
    <Layout>
      <div className="max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/customers')} className="text-gray-400 hover:text-gray-600">
            ← Back
          </button>
          <h2 className="text-xl font-semibold text-gray-900">{customer.name}</h2>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 mb-4">
          <Row label="GST Number" value={customer.gst} />
          <Row label="Organisation" value={customer.org} />
          <Row label="Address" value={customer.address} />
          <Row label="Phone" value={customer.phone} />
          <Row label="Model Number" value={customer.model} />
          <Row label="Spares Required" value={customer.spares} />
        </div>

        <div className="flex gap-3 mb-3">
          <a
            href={`tel:${customer.phone}`}
            className="flex-1 text-center px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Call Customer
          </a>
          <Link
            to={`/customers/${id}/reports/new`}
            className="flex-1 text-center px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Add Service Report
          </Link>
        </div>

        <div className="flex gap-3">
          <Link
            to={`/customers/${id}/reports`}
            className="flex-1 text-center px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            View Report History
          </Link>
          {isAdmin && (
            <Link
              to={`/customers/${id}/edit`}
              className="flex-1 text-center px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Edit Customer
            </Link>
          )}
        </div>
      </div>
    </Layout>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="text-sm text-gray-500 w-36 shrink-0">{label}</span>
      <span className="text-sm text-gray-900">{value || '—'}</span>
    </div>
  )
}
