import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { useAuth } from '../../hooks/useAuth'
import { PART_TYPES, calcRemaining, type PartState, type PartType } from '../../utils/machineParts'

type Service = {
  id: string
  fab_number: string
  model_number: string | null
  sponsor: string | null
  customer: { id: string; name: string; org: string; phone: string }
}

export function ServiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [service, setService] = useState<Service | null>(null)
  const [parts, setParts] = useState<Record<PartType, PartState> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('services').select('id, fab_number, model_number, sponsor, customer:customers(id, name, org, phone)').eq('id', id).single(),
      supabase.from('service_machine_parts').select('*').eq('service_id', id),
    ]).then(([{ data: svc }, { data: partsData }]) => {
      setService(svc as unknown as Service)
      if (partsData) {
        const map = {} as Record<PartType, PartState>
        for (const p of partsData) map[p.part_type as PartType] = { hours_run: p.hours_run, next_hours: p.next_hours, hours_per_day: p.hours_per_day }
        setParts(map)
      }
      setLoading(false)
    })
  }, [id])

  if (loading) return <Layout><p className="text-gray-400 text-sm">Loading...</p></Layout>
  if (!service) return <Layout><p className="text-red-500 text-sm">Machine not found.</p></Layout>

  return (
    <Layout>
      <div className="max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">← Back</button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 font-mono">{service.fab_number}</h2>
            <p className="text-sm text-gray-500">{service.customer.org || service.customer.name}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 mb-4">
          <Row label="Model Number" value={service.model_number} />
          <Row label="Sponsor" value={service.sponsor} />
        </div>

        <div className="flex gap-3 mb-6">
          <Link to={`/services/${id}/reports/new`}
            className="flex-1 text-center px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Add Service Report
          </Link>
          <Link to={`/services/${id}/reports`}
            className="flex-1 text-center px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Report History
          </Link>
        </div>

        {isAdmin && (
          <Link to={`/services/${id}/edit`}
            className="block text-center px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors mb-6">
            Edit Machine
          </Link>
        )}

        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Spare Part Status</h3>
        {parts && (
          <div className="space-y-2">
            {PART_TYPES.map(({ key, label }) => {
              const p = parts[key]
              const { remainingHours, days } = calcRemaining(p)
              const overdue = remainingHours <= 0
              return (
                <div key={key} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${overdue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {overdue ? 'Overdue' : `${Math.ceil(days)}d left`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {p.hours_run} / {p.next_hours} hrs · {p.hours_per_day}h/day
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-4">
      <span className="text-sm text-gray-500 w-36 shrink-0">{label}</span>
      <span className="text-sm text-gray-900">{value || '—'}</span>
    </div>
  )
}
