import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { useAuth } from '../../hooks/useAuth'

export function CustomerNew() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAdmin } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [gstError, setGstError] = useState('')

  const [form, setForm] = useState({
    gst: '', name: '', org: searchParams.get('org') ?? '', address: '', phone: '',
  })

  async function checkGst() {
    if (!form.gst) return
    const { data } = await supabase.from('customers').select('id').eq('gst', form.gst).maybeSingle()
    setGstError(data ? 'A customer with this GST number already exists.' : '')
  }

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (gstError) return
    setError('')
    setSaving(true)

    const { data, error } = await supabase
      .from('customers')
      .insert(form)
      .select('id')
      .single()

    if (error) {
      setError('Failed to save customer. Please try again.')
      setSaving(false)
    } else if (isAdmin) {
      navigate(`/customers/${data.id}`)
    } else {
      // Engineers can't view the admin-only customer detail page — send them
      // straight to filing the first report, which is why they added this customer.
      navigate(`/reports/new/${data.id}`)
    }
  }

  return (
    <Layout>
      <div className="max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">← Back</button>
          <h2 className="text-xl font-semibold text-gray-900">Add Customer</h2>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <Field label="GST Number *" value={form.gst} onChange={set('gst')} onBlur={checkGst} placeholder="e.g. 24AAAAA0000A1Z5" error={gstError} required />
          <Field label="Customer Name *" value={form.name} onChange={set('name')} required />
          <Field label="Company Name *" value={form.org} onChange={set('org')} required />
          <Field label="Address *" value={form.address} onChange={set('address')} textarea required />
          <Field label="Phone Number *" value={form.phone} onChange={set('phone')} type="tel" required autoComplete="tel" />

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
  label, value, onChange, onBlur, type = 'text', required, placeholder, textarea, error, autoComplete
}: {
  label: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onBlur?: () => void; type?: string; required?: boolean; placeholder?: string; textarea?: boolean; error?: string; autoComplete?: string
}) {
  const cls = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {textarea
        ? <textarea value={value} onChange={onChange} onBlur={onBlur} rows={2} placeholder={placeholder} required={required} className={cls} />
        : <input type={type} value={value} onChange={onChange} onBlur={onBlur} required={required} placeholder={placeholder} autoComplete={autoComplete} className={cls} />
      }
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
