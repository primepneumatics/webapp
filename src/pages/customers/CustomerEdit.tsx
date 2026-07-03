import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'

type SparePart = { id: string; code: string; name: string }
type Engineer = { id: string; name: string | null; phone: string }
type Form = { gst: string; name: string; org: string; address: string; phone: string; model: string }

export function CustomerEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<Form>({ gst: '', name: '', org: '', address: '', phone: '', model: '' })
  const [spareParts, setSpareParts] = useState<SparePart[]>([])
  const [selectedSpareIds, setSelectedSpareIds] = useState<string[]>([])
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [assignedEngineerId, setAssignedEngineerId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [gstError, setGstError] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('customers').select('*').eq('id', id).single(),
      supabase.from('spare_parts').select('id, code, name').order('code'),
      supabase.from('profiles').select('id, name, phone').eq('role', 'engineer').order('name'),
    ]).then(([{ data: customer }, { data: parts }, { data: engs }]) => {
      if (customer) {
        setForm({ gst: customer.gst || '', name: customer.name || '', org: customer.org || '', address: customer.address || '', phone: customer.phone || '', model: customer.model || '' })
        setSelectedSpareIds(customer.spare_part_ids ?? [])
        setAssignedEngineerId(customer.assigned_engineer_id ?? '')
      }
      if (parts) setSpareParts(parts)
      if (engs) setEngineers(engs)
      setLoading(false)
    })
  }, [id])

  async function checkGst() {
    if (!form.gst) return
    const { data } = await supabase.from('customers').select('id').eq('gst', form.gst).neq('id', id).maybeSingle()
    setGstError(data ? 'A customer with this GST number already exists.' : '')
  }

  function set(field: keyof Form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function toggleSpare(spareId: string) {
    setSelectedSpareIds(prev =>
      prev.includes(spareId) ? prev.filter(x => x !== spareId) : [...prev, spareId]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (gstError) return
    setError('')
    setSaving(true)

    const { error } = await supabase
      .from('customers')
      .update({
        ...form,
        spare_part_ids: selectedSpareIds,
        assigned_engineer_id: assignedEngineerId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      setError('Failed to save. Please try again.')
      setSaving(false)
    } else {
      navigate(`/customers/${id}`)
    }
  }

  if (loading) return <Layout><p className="text-gray-400 text-sm">Loading...</p></Layout>

  return (
    <Layout>
      <div className="max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(`/customers/${id}`)} className="text-gray-400 hover:text-gray-600">← Back</button>
          <h2 className="text-xl font-semibold text-gray-900">Edit Customer</h2>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <Field label="GST Number" value={form.gst} onChange={set('gst')} onBlur={checkGst} placeholder="e.g. 24AAAAA0000A1Z5" error={gstError} />
          <Field label="Customer Name *" value={form.name} onChange={set('name')} required />
          <Field label="Organisation Name" value={form.org} onChange={set('org')} />
          <Field label="Address" value={form.address} onChange={set('address')} textarea />
          <Field label="Phone Number *" value={form.phone} onChange={set('phone')} type="tel" required autoComplete="tel" />
          <Field label="Model Number" value={form.model} onChange={set('model')} autoComplete="off" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign Engineer</label>
            <select
              value={assignedEngineerId}
              onChange={e => setAssignedEngineerId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Unassigned</option>
              {engineers.map(eng => (
                <option key={eng.id} value={eng.id}>{eng.name || eng.phone}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">The assigned engineer will see this customer in their Customers list.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Spares Required</label>
            {spareParts.length === 0 ? (
              <p className="text-xs text-gray-400">No spare parts in master list yet. Add them via Admin → Spare Parts.</p>
            ) : (
              <div className="border border-gray-300 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {spareParts.map(p => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selectedSpareIds.includes(p.id)} onChange={() => toggleSpare(p.id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">
                      <span className="font-mono text-gray-400 text-xs mr-1">{p.code}</span>{p.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </Layout>
  )
}

function Field({
  label, value, onChange, onBlur, type = 'text', required, placeholder, textarea, error, autoComplete,
}: {
  label: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onBlur?: () => void; type?: string; required?: boolean; placeholder?: string; textarea?: boolean; error?: string; autoComplete?: string
}) {
  const cls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {textarea
        ? <textarea value={value} onChange={onChange} onBlur={onBlur} rows={2} placeholder={placeholder} className={cls} />
        : <input type={type} value={value} onChange={onChange} onBlur={onBlur} required={required} placeholder={placeholder} autoComplete={autoComplete} className={cls} />
      }
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
