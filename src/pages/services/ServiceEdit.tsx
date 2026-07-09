import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { SuggestInput } from '../../components/SuggestInput'
import { useEngineerSuggestions } from '../../hooks/useEngineerSuggestions'
import { PART_TYPES, emptyPartState, type PartState, type PartType } from '../../utils/machineParts'
import { alphanumericOnly } from '../../utils/validate'

type SparePart = { id: string; code: string; name: string }
type Form = { fab_number: string; model_number: string; assigned_engineer: string; sponsor: string }

export function ServiceEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const engineerSuggestions = useEngineerSuggestions()
  const [form, setForm] = useState<Form>({ fab_number: '', model_number: '', assigned_engineer: '', sponsor: '' })
  const [parts, setParts] = useState<Record<PartType, PartState>>(emptyPartState())
  const [spareParts, setSpareParts] = useState<SparePart[]>([])
  const [selectedSpareIds, setSelectedSpareIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fabError, setFabError] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('services').select('*').eq('id', id).single(),
      supabase.from('service_machine_parts').select('*').eq('service_id', id),
      supabase.from('spare_parts').select('id, code, name').order('code'),
    ]).then(([{ data: svc }, { data: partsData }, { data: spares }]) => {
      if (svc) {
        setForm({
          fab_number: svc.fab_number || '',
          model_number: svc.model_number || '',
          assigned_engineer: svc.assigned_engineer || '',
          sponsor: svc.sponsor || '',
        })
        setSelectedSpareIds(svc.spare_part_ids ?? [])
      }
      if (partsData) {
        setParts(prev => {
          const next = { ...prev }
          for (const p of partsData) {
            next[p.part_type as PartType] = { hours_run: p.hours_run, next_hours: p.next_hours, hours_per_day: p.hours_per_day }
          }
          return next
        })
      }
      if (spares) setSpareParts(spares)
      setLoading(false)
    })
  }, [id])

  async function checkFab() {
    if (!form.fab_number) return
    const { data } = await supabase.from('services').select('id').eq('fab_number', form.fab_number).neq('id', id).maybeSingle()
    setFabError(data ? 'A machine with this FAB Number already exists.' : '')
  }

  function set(field: keyof Form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function setAlphanumeric(field: 'fab_number' | 'model_number') {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: alphanumericOnly(e.target.value) }))
  }

  function setPart(type: PartType, field: keyof PartState, value: number) {
    setParts(prev => ({ ...prev, [type]: { ...prev[type], [field]: value } }))
  }

  function toggleSpare(sid: string) {
    setSelectedSpareIds(prev => prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (fabError || !form.fab_number.trim()) return
    setError('')
    setSaving(true)

    const { error: svcError } = await supabase
      .from('services')
      .update({
        fab_number: form.fab_number.trim(),
        model_number: form.model_number.trim() || null,
        assigned_engineer: form.assigned_engineer.trim() || null,
        sponsor: form.sponsor.trim() || null,
        spare_part_ids: selectedSpareIds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (svcError) {
      setError(svcError.code === '23505' ? 'A machine with this FAB Number already exists.' : 'Failed to save. Please try again.')
      setSaving(false)
      return
    }

    const { error: partsError } = await supabase.from('service_machine_parts').upsert(
      PART_TYPES.map(({ key }) => ({
        service_id: id,
        part_type: key,
        hours_run: parts[key].hours_run,
        next_hours: parts[key].next_hours,
        hours_per_day: parts[key].hours_per_day,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'service_id,part_type' }
    )

    if (partsError) {
      setError('Machine saved, but spare part schedule failed to save.')
      setSaving(false)
      return
    }

    navigate(`/services/${id}`)
  }

  if (loading) return <Layout><p className="text-gray-400 text-sm">Loading...</p></Layout>

  return (
    <Layout>
      <div className="max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(`/services/${id}`)} className="text-gray-400 hover:text-gray-600">← Back</button>
          <h2 className="text-xl font-semibold text-gray-900">Edit Machine</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <Field label="FAB Number *" value={form.fab_number} onChange={setAlphanumeric('fab_number')} onBlur={checkFab} required error={fabError} />
            <Field label="Model Number" value={form.model_number} onChange={setAlphanumeric('model_number')} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Engineer</label>
              <SuggestInput value={form.assigned_engineer} onChange={v => setForm(f => ({ ...f, assigned_engineer: v }))}
                suggestions={engineerSuggestions} placeholder="Type a name..." />
            </div>

            <Field label="Sponsor" value={form.sponsor} onChange={set('sponsor')} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Spares Required</label>
              {spareParts.length === 0 ? (
                <p className="text-xs text-gray-400">No spare parts in master list yet.</p>
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
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Spare Part Schedule</h3>
            {PART_TYPES.map(({ key, label }) => (
              <div key={key} className="border-t border-gray-100 pt-3 first:border-t-0 first:pt-0">
                <p className="text-sm font-medium text-gray-800 mb-2">{label}</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Hours Run</label>
                    <input type="number" min="0" value={parts[key].hours_run}
                      onChange={e => setPart(key, 'hours_run', parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Next Hours</label>
                    <input type="number" min="0" value={parts[key].next_hours}
                      onChange={e => setPart(key, 'next_hours', parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Hrs/Day</label>
                    <select value={parts[key].hours_per_day}
                      onChange={e => setPart(key, 'hours_per_day', parseInt(e.target.value) as 12 | 24)}
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value={12}>12h</option>
                      <option value={24}>24h</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
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
  label, value, onChange, onBlur, required, error,
}: {
  label: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: () => void; required?: boolean; error?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type="text" value={value} onChange={onChange} onBlur={onBlur} required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
