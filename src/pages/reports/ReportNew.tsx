import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { SuggestInput } from '../../components/SuggestInput'
import { useEngineerSuggestions } from '../../hooks/useEngineerSuggestions'
import { toISODate, toDisplayDate, today } from '../../utils/dateEngine'
import { calcRemaining, addDaysToDate, type PartState } from '../../utils/machineParts'
import { alphanumericOnly } from '../../utils/validate'

type SparePart = { id: string; code: string; name: string }
type ServiceInfo = { id: string; fab_number: string; model_number: string | null; customer_id: string }
type TrackedPart = { spare_part_id: string; code: string; name: string; qty: string; hours_per_day: 12 | 24; remaining_hrs: string; maintenance_days: string }

export function ReportNew() {
  const { id: serviceId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const engineerSuggestions = useEngineerSuggestions()

  const [service, setService] = useState<ServiceInfo | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [spareParts, setSpareParts] = useState<SparePart[]>([])

  const [trackedParts, setTrackedParts] = useState<TrackedPart[]>([])
  const [trackPartId, setTrackPartId] = useState('')

  const [reportDate, setReportDate] = useState(today())
  const [totalRunHours, setTotalRunHours] = useState('')
  const [fabNumber, setFabNumber] = useState('')
  const [fabError, setFabError] = useState('')
  const [remarks, setRemarks] = useState('')
  const [servicedBy, setServicedBy] = useState('')

  useEffect(() => {
    supabase.from('services').select('id, fab_number, model_number, customer_id').eq('id', serviceId).single()
      .then(({ data }) => { if (data) { setService(data); setFabNumber(data.fab_number) } })
    supabase.from('spare_parts').select('id, code, name').order('code').then(({ data }) => {
      if (data) setSpareParts(data)
    })
  }, [serviceId])

  async function checkFab() {
    if (!service || !fabNumber || fabNumber === service.fab_number) { setFabError(''); return }
    const { data } = await supabase.from('services').select('id').eq('fab_number', fabNumber).neq('id', service.id).maybeSingle()
    setFabError(data ? 'A machine with this FAB Number already exists.' : '')
  }

  function addTrackedPart() {
    const part = spareParts.find(p => p.id === trackPartId)
    if (!part || trackedParts.some(tp => tp.spare_part_id === part.id)) return
    setTrackedParts(prev => [...prev, { spare_part_id: part.id, code: part.code, name: part.name, qty: '1', hours_per_day: 24, remaining_hrs: '0', maintenance_days: '0' }])
    setTrackPartId('')
  }

  function removeTrackedPart(spare_part_id: string) {
    setTrackedParts(prev => prev.filter(tp => tp.spare_part_id !== spare_part_id))
  }

  function updateTrackedPart(spare_part_id: string, field: 'qty' | 'hours_per_day' | 'remaining_hrs' | 'maintenance_days', value: string | number) {
    setTrackedParts(prev => prev.map(tp => tp.spare_part_id === spare_part_id ? { ...tp, [field]: value } : tp))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!service || fabError || !fabNumber.trim()) return
    setError('')
    setSaving(true)

    if (fabNumber.trim() !== service.fab_number) {
      const { error: fabUpdateError } = await supabase
        .from('services')
        .update({ fab_number: fabNumber.trim(), updated_at: new Date().toISOString() })
        .eq('id', service.id)
      if (fabUpdateError) {
        setError(fabUpdateError.code === '23505' ? 'A machine with this FAB Number already exists.' : 'Failed to update FAB number.')
        setSaving(false)
        return
      }
    }

    const { data: { user } } = await supabase.auth.getUser()

    const hoursRun = parseFloat(totalRunHours) || 0

    let earliestDue: Date | null = null
    const snapshotRows = trackedParts.map(tp => {
      const remaining = Math.max(0, parseFloat(tp.remaining_hrs) || 0)
      const p: PartState = { hours_run: hoursRun, next_hours: hoursRun + remaining, hours_per_day: tp.hours_per_day }
      const offDays = Math.max(0, parseInt(tp.maintenance_days) || 0)
      const { remainingHours, days } = calcRemaining(p)
      const dueDate = addDaysToDate(new Date(reportDate), Math.max(0, days) + offDays)
      if (!earliestDue || dueDate < earliestDue) earliestDue = dueDate
      return {
        spare_part_id: tp.spare_part_id,
        qty: Math.max(1, parseInt(tp.qty) || 1),
        hours_run: p.hours_run,
        next_hours: p.next_hours,
        hours_per_day: p.hours_per_day,
        remaining_hours: remainingHours,
        due_date: toISODate(dueDate),
        maintenance_days: offDays,
      }
    })

    const { data: report, error: reportError } = await supabase
      .from('service_reports')
      .insert({
        service_id: serviceId,
        report_date: reportDate,
        total_run_hours: hoursRun,
        remarks,
        serviced_by: servicedBy.trim() || null,
        due_service_date: earliestDue ? toISODate(earliestDue) : null,
        filed_by_id: user?.id ?? null,
      })
      .select('id')
      .single()

    if (reportError || !report) {
      setError('Failed to save report. Please try again.')
      setSaving(false)
      return
    }

    if (snapshotRows.length > 0) {
      const { error: partsError } = await supabase.from('service_report_parts').insert(
        snapshotRows.map(r => ({ ...r, service_report_id: report.id }))
      )
      if (partsError) {
        setError('Report saved, but spare part snapshot failed to save.')
        setSaving(false)
        return
      }

      await supabase.from('service_machine_parts').upsert(
        trackedParts.map(tp => {
          const remaining = Math.max(0, parseFloat(tp.remaining_hrs) || 0)
          return {
            service_id: serviceId,
            spare_part_id: tp.spare_part_id,
            hours_run: hoursRun,
            next_hours: hoursRun + remaining,
            hours_per_day: tp.hours_per_day,
            updated_at: new Date().toISOString(),
          }
        }),
        { onConflict: 'service_id,spare_part_id' }
      )
    }

    navigate(`/reports/${report.id}`)
  }

  if (!service) return <Layout><p className="text-gray-400 text-sm">Loading...</p></Layout>

  return (
    <Layout>
      <div className="max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(`/services/${serviceId}`)} className="text-gray-400 hover:text-gray-600">← Back</button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">New Service Report</h2>
            <p className="text-sm text-gray-500 font-mono">{service.fab_number}{service.model_number ? ` · ${service.model_number}` : ''}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header block */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Date</label>
              <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">FAB Number *</label>
              <input type="text" value={fabNumber} onChange={e => setFabNumber(alphanumericOnly(e.target.value))} onBlur={checkFab} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {fabError ? (
                <p className="text-xs text-red-600 mt-1">{fabError}</p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">Tied to this machine — changing it here updates the machine's FAB Number too.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Run Hours *</label>
              <input type="number" min="0" value={totalRunHours} onChange={e => setTotalRunHours(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Spare item hours — dynamic, add from the spare parts list */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Spare Item Hours</h3>
            <div className="flex gap-2">
              <select value={trackPartId} onChange={e => setTrackPartId(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select spare part...</option>
                {spareParts.filter(p => !trackedParts.some(tp => tp.spare_part_id === p.id)).map(p => (
                  <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                ))}
              </select>
              <button type="button" onClick={addTrackedPart} disabled={!trackPartId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
                + Add
              </button>
            </div>

            {trackedParts.length === 0 ? (
              <p className="text-xs text-gray-400">No spare parts added for this report yet.</p>
            ) : (
              trackedParts.map(tp => {
                const hoursRunPreview = parseFloat(totalRunHours) || 0
                const remainingPreview = Math.max(0, parseFloat(tp.remaining_hrs) || 0)
                const effective: PartState = { hours_run: hoursRunPreview, next_hours: hoursRunPreview + remainingPreview, hours_per_day: tp.hours_per_day }
                const { remainingHours, days } = calcRemaining(effective)
                const overdue = remainingHours <= 0
                const offDays = Math.max(0, parseInt(tp.maintenance_days) || 0)
                return (
                  <div key={tp.spare_part_id} className="border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-800">
                        <span className="font-mono text-gray-400 text-xs mr-1">{tp.code}</span>{tp.name}
                      </p>
                      <button type="button" onClick={() => removeTrackedPart(tp.spare_part_id)}
                        className="text-red-400 hover:text-red-600 text-xs">×</button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Qty</label>
                        <input type="number" min="1" value={tp.qty}
                          onChange={e => updateTrackedPart(tp.spare_part_id, 'qty', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Remaining Hrs</label>
                        <input type="number" min="0" value={tp.remaining_hrs}
                          onChange={e => updateTrackedPart(tp.spare_part_id, 'remaining_hrs', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Hrs/Day</label>
                        <select value={tp.hours_per_day}
                          onChange={e => updateTrackedPart(tp.spare_part_id, 'hours_per_day', parseInt(e.target.value) as 12 | 24)}
                          className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value={12}>12h</option>
                          <option value={24}>24h</option>
                        </select>
                      </div>
                    </div>
                    <div className="mb-2">
                      <label className="block text-xs text-gray-500 mb-1">Maintenance Days</label>
                      <input type="number" min="0" value={tp.maintenance_days}
                        onChange={e => updateTrackedPart(tp.spare_part_id, 'maintenance_days', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <p className="text-xs text-gray-400 mt-1">Planned off days for this part (e.g. plant shutdown), added on top of its calculated due date.</p>
                    </div>
                    <p className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-blue-600'}`}>
                      {overdue
                        ? `Overdue by ${Math.abs(remainingHours)} hrs`
                        : `${remainingHours} hrs remaining · ~${Math.ceil(days)} days · due ${toDisplayDate(toISODate(addDaysToDate(new Date(reportDate), days + offDays)))}`}
                    </p>
                  </div>
                )
              })
            )}
          </div>

          {/* Remarks */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Service by — filled last */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Service By</label>
            <SuggestInput value={servicedBy} onChange={setServicedBy} suggestions={engineerSuggestions}
              placeholder="Engineer name (optional, can fill in later)" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'File Service Report'}
          </button>
        </form>
      </div>
    </Layout>
  )
}
