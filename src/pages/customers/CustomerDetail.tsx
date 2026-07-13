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
}

type Service = {
  id: string
  fab_number: string
  model_number: string | null
}

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('customers').select('*').eq('id', id).single(),
      supabase.from('services').select('id, fab_number, model_number').eq('customer_id', id).order('fab_number'),
    ]).then(([{ data: cust }, { data: svc }]) => {
      setCustomer(cust)
      if (svc) setServices(svc)
      setLoading(false)
    })
  }, [id])

  if (loading) return <Layout><p className="text-gray-400 text-sm">Loading...</p></Layout>
  if (!customer) return <Layout><p className="text-red-500 text-sm">Customer not found.</p></Layout>

  return (
    <Layout>
      <div className="max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
            ← Back
          </button>
          <h2 className="text-xl font-semibold text-gray-900">{customer.name}</h2>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 mb-4">
          <Row label="Company Name" value={customer.org} />
          <Row label="Address" value={customer.address} />
          {isAdmin && (
            <>
              <Row label="GST Number" value={customer.gst} />
              <Row label="Phone" value={customer.phone} />
            </>
          )}
        </div>

        <div className="flex gap-3 mb-3">
          <a
            href={`tel:${customer.phone}`}
            className="flex-1 text-center px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Call Customer
          </a>
          {isAdmin && (
            <Link
              to={`/customers/${id}/edit`}
              className="flex-1 text-center px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Edit Customer
            </Link>
          )}
        </div>

        <div className="flex gap-3 mb-4">
          <Link
            to={`/reports/new/${id}`}
            className="flex-1 text-center px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            File Service Report
          </Link>
          {isAdmin && (
            <Link
              to={`/customers/${id}/reports`}
              className="flex-1 text-center px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Report History
            </Link>
          )}
        </div>

        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Machines</h3>
          <Link
            to={`/customers/${id}/services/new`}
            className="text-sm text-blue-600 font-medium hover:underline"
          >
            + Add Machine
          </Link>
        </div>

        {services.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-400">No machines added yet.</p>
            <Link to={`/customers/${id}/services/new`} className="text-blue-600 text-sm mt-2 inline-block">
              Add the first machine &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {services.map(s => (
              <div
                key={s.id}
                className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between active:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/services/${s.id}`)}
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-gray-900">{s.fab_number}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {s.model_number || 'No model set'}
                  </p>
                </div>
                <span className="text-gray-300 text-xl ml-3 shrink-0">&#8250;</span>
              </div>
            ))}
          </div>
        )}
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
