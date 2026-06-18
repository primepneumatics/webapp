import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'

export function CustomerNew() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    gst: '',
    name: '',
    org: '',
    address: '',
    phone: '',
    model: '',
    spares: '',
  })

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { data, error } = await supabase
      .from('customers')
      .insert({ ...form })
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
          <button onClick={() => navigate('/customers')} className="text-gray-400 hover:text-gray-600">
            ← Back
          </button>
          <h2 className="text-xl font-semibold text-gray-900">Add Customer</h2>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <Field label="GST Number" value={form.gst} onChange={set('gst')} placeholder="e.g. 24AAAAA0000A1Z5" />
          <Field label="Customer Name *" value={form.name} onChange={set('name')} required />
          <Field label="Organisation Name" value={form.org} onChange={set('org')} />
          <Field label="Address" value={form.address} onChange={set('address')} textarea />
          <Field label="Phone Number *" value={form.phone} onChange={set('phone')} type="tel" required />
          <Field label="Model Number" value={form.model} onChange={set('model')} />
          <Field label="Spares Required" value={form.spares} onChange={set('spares')} textarea />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Customer'}
          </button>
        </form>
      </div>
    </Layout>
  )
}

function Field({
  label, value, onChange, type = 'text', required, placeholder, textarea
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  type?: string
  required?: boolean
  placeholder?: string
  textarea?: boolean
}) {
  const cls = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {textarea
        ? <textarea value={value} onChange={onChange} rows={2} placeholder={placeholder} className={cls} />
        : <input type={type} value={value} onChange={onChange} required={required} placeholder={placeholder} className={cls} />
      }
    </div>
  )
}
