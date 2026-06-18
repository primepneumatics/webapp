import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'

type SparePart = { id: string; code: string; name: string }

export function CustomerNew() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [gstError, setGstError] = useState('')
  const [spareParts, setSpareParts] = useState<SparePart[]>([])
  const [selectedSpareIds, setSelectedSpareIds] = useState<string[]>([])

  const [form, setForm] = useState({
    gst: '', name: '', org: '', address: '', phone: '', model: '',
  })

  useEffect(() => {
    supabase.from('spare_parts').select('id, code, name').order('code').then(({ data }) => {
      if (data) setSpareParts(data)
    })
  }, [])

  async function checkGst() {
    if (!form.gst) return
    const { data } = await supabase.from('customers').select('id').eq('gst', form.gst).maybeSingle()
    setGstError(data ? 'A customer with this GST number already exists.' : '')
  }

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function toggleSpare(id: string) {
    setSelectedSpareIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (gstError) return
    setError('')
    setSaving(true)

    const { data, error } = await supabase
      .from('customers')
      .insert({ ...form, spare_part_ids: selectedSpareIds })
      .select('id')
      .single()

    if (error) {
      setError('Failed to save customer. Please try again.')
      setSaving(false)
    } else {
      navigate(`/customers/${data.id}`)
    }
  }

  return (
    <Layout>
      <div className="max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/customers')} className="text-gray-400 hover:text-gray-600">← Back</button>
          <h2 className="text-xl font-semibold text-gray-900">Add Customer</h2>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <Field label="GST Number" value={form.gst} onChange={set('gst')} onBlur={checkGst} placeholder="e.g. 24AAAAA0000A1Z5" error={gstError} />
          <Field label="Customer Name *" value={form.name} onChange={set('name')} required />
          <Field label="Organisation Name" value={form.org} onChange={set('org')} />
          <Field label="Address" value={form.address} onChange={set('address')} textarea />
          <Field label="Phone Number *" value={form.phone} onChange={set('phone')} type="tel" required />
          <Field label="Model Number" value={form.model} onChange={set('model')} />

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
            {saving ? 'Saving...' : 'Save Customer'}
          </button>
        </form>
      </div>
    </Layout>
  )
}

function Field({
  label, value, onChange, onBlur, type = 'text', required, placeholder, textarea, error
}: {
  label: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onBlur?: () => void; type?: string; required?: boolean; placeholder?: string; textarea?: boolean; error?: string
}) {
  const cls = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {textarea
        ? <textarea value={value} onChange={onChange} onBlur={onBlur} rows={2} placeholder={placeholder} className={cls} />
        : <input type={type} value={value} onChange={onChange} onBlur={onBlur} required={required} placeholder={placeholder} className={cls} />
      }
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
