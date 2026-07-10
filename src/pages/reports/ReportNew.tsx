import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { SuggestInput } from '../../components/SuggestInput'
import { useEngineerSuggestions } from '../../hooks/useEngineerSuggestions'
import { toISODate, toDisplayDate, today } from '../../utils/dateEngine'
import { PART_TYPES, calcRemaining, addDaysToDate, type PartState, type PartType } from '../../utils/machineParts'

type SparePart = { id: string; code: string; name: string }
type SelectedSpare = { id: string; code: string; name: string; qty: number }
type ServiceInfo = { id: string; fab_number: string; model_number: string | null; customer_id: string }

export function ReportNew() {
  const { id: serviceId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const engineerSuggestions = useEngineerSuggestions()

  const [service, setService] = useState<ServiceInfo | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [spareParts, setSpareParts] = useState<SparePart[]>([])
  const [selectedSpares, setSelectedSpares] = useState<SelectedSpare[]>([])
  const [spareId, setSpareId] = useState('')
  const [spareQty, setSpareQty] = useState('1')

  const [parts, setParts] = useState<Record<PartType, PartState> | null>(null)

  const [reportDate, setReportDate] = useState(today())
  const [totalRunHours, setTotalRunHours] = useState('')
  const [maintenanceDays, setMaintenanceDays] = useState('0')
  const [remarks, setRemarks] = useState('')
  const [servicedBy, setServicedBy] = useState('')

  useEffect(() => {
    supabase.from('services').select('id, fab_number, model_number, customer_id').eq('id', serviceId).single()
      .then(({ data }) => { if (data) setService(data) })
    supabase.from('spare_parts').select('id, code, name').order('code').then(({ data }) => {
      if (data) setSpareParts(data)
    })
    supabase.from('service_machine_parts').select('*').eq('service_id', serviceId).then(({ data }) => {
      if (data) {
        const map = {} as Record<PartType, PartState>
        for (const p of data) map[p.part_type as PartType] = { hours_run: p.hours_run, next_hours: p.next_hours, hours_per_day: p.hours_per_day }
        setParts(map)
      }
    })
  }, [serviceId])

  function setPart(type: PartType, field: keyof PartState, value: number) {
    setParts(prev => prev ? { ...prev, [type]: { ...prev[type], [field]: value } } : prev)
  }

  function addSpare() {
    const part = spareParts.find(p => p.id === spareId)
    if (!part) return
    const qty = Math.max(1, parseInt(spareQty) || 1)
    setSelectedSpares(prev => {
      const existing = prev.findIndex(s => s.id === part.id)
      if (existing >= 0) return prev.map((s, i) => i === existing ? { ...s, qty: s.qty + qty } : s)
      return [...prev, { id: part.id, code: part.code, name: part.name, qty }]
    })
    setSpareId('')
    setSpareQty('1')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!parts || !service) return
    setError('')
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()

    const offDays = Math.max(0, parseInt(maintenanceDays) || 0)

    let earliestDue: Date | null = null
    const snapshotRows = PART_TYPES.map(({ key }) => {
      const p = parts[key]
      const { remainingHours, days } = calcRemaining(p)
      const dueDate = addDaysToDate(new Date(reportDate), Math.max(0, days) + offDays)
      if (!earliestDue || dueDate < earliestDue) earliestDue = dueDate
      return {
        part_type: key,
        hours_run: p.hours_run,
        next_hours: p.next_hours,
        hours_per_day: p.hours_per_day,
        remaining_hours: remainingHours,
        due_date: toISODate(dueDate),
      }
    })

    const { data: report, error: reportError } = await supabase
      .from('service_reports')
      .insert({
        service_id: serviceId,
        report_date: reportDate,
        total_run_hours: parseFloat(totalRunHours) || 0,
        maintenance_days: offDays,
        remarks,
        serviced_by: servicedBy.trim() || null,
        selected_spares: selectedSpares,
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

    const { error: partsError } = await supabase.from('service_report_parts').insert(
      snapshotRows.map(r => ({ ...r, service_report_id: report.id }))
    )
    if (partsError) {
      setError('Report saved, but spare part snapshot failed to save.')
      setSaving(false)
      return
    }

    await supabase.from('service_machine_parts').upsert(
      PART_TYPES.map(({ key }) => ({
        service_id: serviceId,
        part_type: key,
        hours_run: parts[key].hours_run,
        next_hours: parts[key].next_hours,
        hours_per_day: parts[key].hours_per_day,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'service_id,part_type' }
    )

    navigate(`/reports/${report.id}`)
  }

  if (!service || !parts) return <Layout><p className="text-gray-400 text-sm">Loading...</p></Layout>

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
              <label className="block text-sm font-medium text-gray-700 mb-1">FAB Number</label>
              <p className="text-sm text-gray-500 font-mono py-2">{service.fab_number}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Run Hours *</label>
              <input type="number" min="0" value={totalRunHours} onChange={e => setTotalRunHours(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Days</label>
              <input type="number" min="0" value={maintenanceDays} onChange={e => setMaintenanceDays(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-gray-400 mt-1">Planned off days the machine won't run (e.g. plant shutdown). Added on top of every part's calculated due date.</p>
            </div>
          </div>

          {/* Spare items block */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Spare Item Hours</h3>
            {PART_TYPES.map(({ key, label }) => {
              const p = parts[key]
              const { remainingHours, days } = calcRemaining(p)
              const overdue = remainingHours <= 0
              return (
                <div key={key} className="border-t border-gray-100 pt-4 first:border-t-0 first:pt-0">
                  <p className="text-sm font-medium text-gray-800 mb-2">{label}</p>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Hours Run</label>
                      <input type="number" min="0" value={p.hours_run}
                        onChange={e => setPart(key, 'hours_run', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Next Hours</label>
                      <input type="number" min="0" value={p.next_hours}
                        onChange={e => setPart(key, 'next_hours', parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Hrs/Day</label>
                      <select value={p.hours_per_day}
                        onChange={e => setPart(key, 'hours_per_day', parseInt(e.target.value) as 12 | 24)}
                        className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value={12}>12h</option>
                        <option value={24}>24h</option>
                      </select>
                    </div>
                  </div>
                  <p className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-blue-600'}`}>
                    {overdue
                      ? `Overdue by ${Math.abs(remainingHours)} hrs`
                      : `${remainingHours} hrs remaining · ~${Math.ceil(days)} days · due ${toDisplayDate(toISODate(addDaysToDate(new Date(reportDate), days + (Math.max(0, parseInt(maintenanceDays) || 0)))))}`}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Spare Parts Used */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Spare Parts Used</h3>
            <div className="space-y-2">
              <select value={spareId} onChange={e => setSpareId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select spare part...</option>
                {spareParts.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
              <div className="flex gap-2">
                <input type="number" value={spareQty} onChange={e => setSpareQty(e.target.value)} min="1" placeholder="Qty"
                  className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={addSpare} disabled={!spareId}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
                  + Add
                </button>
              </div>
            </div>
            {selectedSpares.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="pb-2">Spare Part</th><th className="pb-2 text-right">Qty</th><th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSpares.map(s => (
                    <tr key={s.id} className="border-b border-gray-50">
                      <td className="py-2 text-gray-800"><span className="font-mono text-gray-400 text-xs mr-1">{s.code}</span>{s.name}</td>
                      <td className="py-2 text-right text-gray-600">{s.qty}</td>
                      <td className="py-2 text-right">
                        <button type="button" onClick={() => setSelectedSpares(prev => prev.filter(x => x.id !== s.id))}
                          className="text-red-400 hover:text-red-600 text-xs">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
