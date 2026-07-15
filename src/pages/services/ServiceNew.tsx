import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { SuggestInput } from '../../components/SuggestInput'
import { alphanumericOnly, modelNumberChars } from '../../utils/validate'

type ExistingMachine = { id: string; fab_number: string; model_number: string | null; sponsor: string | null }

export function ServiceNew() {
  const { id: customerId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fabError, setFabError] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [existingMachines, setExistingMachines] = useState<ExistingMachine[]>([])

  const [form, setForm] = useState({ fab_number: '', model_number: '', sponsor: '' })

  useEffect(() => {
    supabase.from('customers').select('name').eq('id', customerId).single().then(({ data }) => {
      if (data) setCustomerName(data.name)
    })
    supabase.from('services').select('id, fab_number, model_number, sponsor').eq('customer_id', customerId).then(({ data }) => {
      if (data) setExistingMachines(data)
    })
  }, [customerId])

  const matchedMachine = form.model_number
    ? existingMachines.find(m => m.model_number === form.model_number) ?? null
    : null

  function handleModelNumberChange(rawValue: string) {
    const value = modelNumberChars(rawValue)
    const match = existingMachines.find(m => m.model_number === value)
    if (match) {
      setForm({ model_number: value, fab_number: match.fab_number, sponsor: match.sponsor ?? '' })
      setFabError('')
    } else {
      setForm(f => ({ ...f, model_number: value }))
    }
  }

  async function checkFab() {
    if (!form.fab_number) return
    let query = supabase.from('services').select('id').eq('fab_number', form.fab_number)
    if (matchedMachine) query = query.neq('id', matchedMachine.id)
    const { data } = await query.maybeSingle()
    setFabError(data ? 'A machine with this FAB Number already exists.' : '')
  }

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function setAlphanumeric(field: 'fab_number' | 'model_number') {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: alphanumericOnly(e.target.value) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (fabError || !form.fab_number.trim()) return
    setError('')
    setSaving(true)

    if (matchedMachine) {
      const { error: updateError } = await supabase
        .from('services')
        .update({
          fab_number: form.fab_number.trim(),
          sponsor: form.sponsor.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', matchedMachine.id)

      if (updateError) {
        setError(updateError.code === '23505' ? 'A machine with this FAB Number already exists.' : 'Failed to save. Please try again.')
        setSaving(false)
        return
      }

      navigate(`/services/${matchedMachine.id}`)
      return
    }

    const { data: service, error: svcError } = await supabase
      .from('services')
      .insert({
        customer_id: customerId,
        fab_number: form.fab_number.trim(),
        model_number: form.model_number.trim() || null,
        sponsor: form.sponsor.trim() || null,
      })
      .select('id')
      .single()

    if (svcError || !service) {
      setError(svcError?.code === '23505' ? 'A machine with this FAB Number already exists.' : 'Failed to save machine. Please try again.')
      setSaving(false)
      return
    }

    navigate(`/services/${service.id}`)
  }

  return (
    <Layout>
      <div className="max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(`/customers/${customerId}`)} className="text-gray-400 hover:text-gray-600">← Back</button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Add Machine</h2>
            {customerName && <p className="text-sm text-gray-500">{customerName}</p>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <Field label="FAB Number *" value={form.fab_number} onChange={setAlphanumeric('fab_number')} onBlur={checkFab} required error={fabError} placeholder="e.g. FAB2K91A" />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model Number</label>
              <SuggestInput
                value={form.model_number}
                onChange={handleModelNumberChange}
                suggestions={existingMachines.map(m => m.model_number).filter((v): v is string => !!v)}
                placeholder="e.g. GA30VSD"
              />
              {matchedMachine && (
                <p className="text-xs text-blue-600 mt-1">Existing machine found for this customer — FAB Number and Sponsor filled in from it.</p>
              )}
            </div>

            <Field label="Sponsor" value={form.sponsor} onChange={set('sponsor')} placeholder="Dealer / referrer name" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : matchedMachine ? 'Use Existing Machine' : 'Save Machine'}
          </button>
        </form>
      </div>
    </Layout>
  )
}

function Field({
  label, value, onChange, onBlur, required, placeholder, error,
}: {
  label: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: () => void; required?: boolean; placeholder?: string; error?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type="text" value={value} onChange={onChange} onBlur={onBlur} required={required} placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
