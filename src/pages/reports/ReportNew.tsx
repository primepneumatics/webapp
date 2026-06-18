import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { calcNextServiceDate, toISODate, today } from '../../utils/dateEngine'

const CHECKLIST_ITEMS = [
  { key: 'air_filter', label: 'Replaced air filter' },
  { key: 'oil_filter', label: 'Replaced oil filter' },
  { key: 'oil_level', label: 'Checked / topped up oil level' },
  { key: 'cooler', label: 'Cleaned cooler' },
  { key: 'belts', label: 'Inspected belts / drive' },
  { key: 'air_leaks', label: 'Checked for air leaks' },
]

export function ReportNew() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [customerName, setCustomerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    report_date: today(),
    fob: '',
    remarks: '',
    hours_run: '',
    hours_until_next: '',
    spares_cost: '',
  })
  const [checklist, setChecklist] = useState<Record<string, boolean>>(
    Object.fromEntries(CHECKLIST_ITEMS.map(i => [i.key, false]))
  )

  useEffect(() => {
    supabase.from('customers').select('name').eq('id', id).single().then(({ data }) => {
      if (data) setCustomerName(data.name)
    })
  }, [id])

  function setField(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function toggleCheck(key: string) {
    setChecklist(c => ({ ...c, [key]: !c[key] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const hoursUntilNext = parseFloat(form.hours_until_next)
    const reportDate = new Date(form.report_date)
    const nextServiceDate = calcNextServiceDate(reportDate, hoursUntilNext)

    const { data, error } = await supabase
      .from('service_reports')
      .insert({
        customer_id: id,
        report_date: form.report_date,
        checklist,
        fob: form.fob,
        remarks: form.remarks,
        hours_run: parseFloat(form.hours_run),
        hours_until_next: hoursUntilNext,
        spares_cost: form.spares_cost ? parseFloat(form.spares_cost) : 0,
        next_service_date: toISODate(nextServiceDate),
      })
      .select('id')
      .single()

    if (error) {
      setError('Failed to save report. Please try again.')
      setSaving(false)
    } else {
      navigate(`/reports/${data.id}`)
    }
  }

  return (
    <Layout>
      <div className="max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(`/customers/${id}`)} className="text-gray-400 hover:text-gray-600">
            ← Back
          </button>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">New Service Report</h2>
            {customerName && <p className="text-sm text-gray-500">{customerName}</p>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Report Details</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Date</label>
              <input
                type="date"
                value={form.report_date}
                onChange={setField('report_date')}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">FOB Number</label>
              <input
                type="text"
                value={form.fob}
                onChange={setField('fob')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hours Already Run *</label>
                <input
                  type="number"
                  value={form.hours_run}
                  onChange={setField('hours_run')}
                  required
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hours Until Next Service *</label>
                <input
                  type="number"
                  value={form.hours_until_next}
                  onChange={setField('hours_until_next')}
                  required
                  min="1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {form.hours_until_next && (
              <p className="text-xs text-blue-600">
                Next service date: {toISODate(calcNextServiceDate(new Date(form.report_date), parseFloat(form.hours_until_next)))}
              </p>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Spares Cost (₹)</label>
              <input
                type="number"
                value={form.spares_cost}
                onChange={setField('spares_cost')}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <textarea
                value={form.remarks}
                onChange={setField('remarks')}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Service Checklist</h3>
            <div className="space-y-3">
              {CHECKLIST_ITEMS.map(item => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist[item.key]}
                    onChange={() => toggleCheck(item.key)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'File Service Report'}
          </button>
        </form>
      </div>
    </Layout>
  )
}
