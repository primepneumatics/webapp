import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { calcNextServiceDate, toISODate, toDisplayDate, today } from '../../utils/dateEngine'


type SparePart = { id: string; code: string; name: string; price_per_unit: number }
type ServiceType = { id: string; code: string; name: string; price: number }

type SelectedSpare = { id: string; code: string; name: string; qty: number; unit_price: number; amount: number }
type SelectedService = { id: string; code: string; name: string; price: number }

export function ReportNew() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
const [customerName, setCustomerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [spareParts, setSpareParts] = useState<SparePart[]>([])
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])

  const [selectedSpares, setSelectedSpares] = useState<SelectedSpare[]>([])
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([])

  const [spareId, setSpareId] = useState('')
  const [spareQty, setSpareQty] = useState('1')
  const [serviceId, setServiceId] = useState('')
  const [adjustedTotalStr, setAdjustedTotalStr] = useState('')

  const [form, setForm] = useState({
    report_date: today(),
    fob: '',
    remarks: '',
    hours_run: '',
    hours_until_next: '',
  })

  useEffect(() => {
    supabase.from('customers').select('name').eq('id', id).single().then(({ data }) => {
      if (data) setCustomerName(data.name)
    })
    supabase.from('spare_parts').select('*').order('code').then(({ data }) => {
      if (data) setSpareParts(data)
    })
    supabase.from('service_types').select('*').order('code').then(({ data }) => {
      if (data) setServiceTypes(data)
    })
  }, [id])

  function setField(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function addSpare() {
    const part = spareParts.find(p => p.id === spareId)
    if (!part) return
    const qty = Math.max(1, parseInt(spareQty) || 1)
    const existing = selectedSpares.findIndex(s => s.id === part.id)
    if (existing >= 0) {
      setSelectedSpares(prev => prev.map((s, i) => i === existing
        ? { ...s, qty: s.qty + qty, amount: (s.qty + qty) * s.unit_price }
        : s
      ))
    } else {
      setSelectedSpares(prev => [...prev, {
        id: part.id, code: part.code, name: part.name,
        qty, unit_price: part.price_per_unit, amount: qty * part.price_per_unit,
      }])
    }
    setSpareId('')
    setSpareQty('1')
  }

  function addService() {
    const svc = serviceTypes.find(s => s.id === serviceId)
    if (!svc) return
    if (selectedServices.find(s => s.id === svc.id)) return
    setSelectedServices(prev => [...prev, { id: svc.id, code: svc.code, name: svc.name, price: svc.price }])
    setServiceId('')
  }

  function removeService(svc: SelectedService) {
    setSelectedServices(prev => prev.filter(x => x.id !== svc.id))
  }

  const sparesTotal = selectedSpares.reduce((sum, s) => sum + s.amount, 0)
  const servicesTotal = selectedServices.reduce((sum, s) => sum + s.price, 0)
  const autoTotal = sparesTotal + servicesTotal
  const parsedAdjusted = parseFloat(adjustedTotalStr)
  const finalTotal =
    adjustedTotalStr !== '' && !isNaN(parsedAdjusted) && parsedAdjusted < autoTotal
      ? Math.max(0, parsedAdjusted)
      : autoTotal
  const discount = autoTotal - finalTotal

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    const hoursUntilNext = parseFloat(form.hours_until_next)
    const reportDate = new Date(form.report_date)
    const nextServiceDate = calcNextServiceDate(reportDate, hoursUntilNext)

    const { data, error } = await supabase
      .from('service_reports')
      .insert({
        customer_id: id,
        report_date: form.report_date,
        fob: form.fob,
        remarks: form.remarks,
        hours_run: parseFloat(form.hours_run),
        hours_until_next: hoursUntilNext,
        selected_spares: selectedSpares,
        selected_services: selectedServices,
        total_amount: finalTotal,
        spares_cost: autoTotal,
        next_service_date: toISODate(nextServiceDate),
        filed_by_id: user?.id ?? null,
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
          {/* Report Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Report Details</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Date</label>
              <input type="date" value={form.report_date} onChange={setField('report_date')} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">FAB Number</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={form.fob}
                onChange={e => setForm(f => ({ ...f, fob: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hours Already Run *</label>
                <input type="number" value={form.hours_run} onChange={setField('hours_run')} required min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hours Until Next *</label>
                <input type="number" value={form.hours_until_next} onChange={setField('hours_until_next')} required min="1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {form.hours_until_next && (
              <p className="text-xs text-blue-600">
                Next service date: {toDisplayDate(toISODate(calcNextServiceDate(new Date(form.report_date), parseFloat(form.hours_until_next))))}
              </p>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <textarea value={form.remarks} onChange={setField('remarks')} rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Spare Parts */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Spare Parts Used</h3>

            <div className="space-y-2">
              <select value={spareId} onChange={e => setSpareId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select spare part...</option>
                {spareParts.map(p => (
                  <option key={p.id} value={p.id}>{p.code} — {p.name} (₹{p.price_per_unit}/unit)</option>
                ))}
              </select>
              <div className="flex gap-2">
                <input type="number" value={spareQty} onChange={e => setSpareQty(e.target.value)}
                  min="1" placeholder="Qty"
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
                    <th className="pb-2">Code</th>
                    <th className="pb-2">Name</th>
                    <th className="pb-2 text-right">Qty</th>
                    <th className="pb-2 text-right">Unit Price</th>
                    <th className="pb-2 text-right">Amount</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSpares.map(s => (
                    <tr key={s.id} className="border-b border-gray-50">
                      <td className="py-2 font-mono text-gray-600">{s.code}</td>
                      <td className="py-2 text-gray-800">{s.name}</td>
                      <td className="py-2 text-right text-gray-600">{s.qty}</td>
                      <td className="py-2 text-right text-gray-600">₹{s.unit_price.toFixed(2)}</td>
                      <td className="py-2 text-right font-medium text-gray-900">₹{s.amount.toFixed(2)}</td>
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

          {/* Services */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Services Performed</h3>

            <div className="space-y-2">
              <select value={serviceId} onChange={e => setServiceId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select service type...</option>
                {serviceTypes.map(s => (
                  <option key={s.id} value={s.id}>{s.code} — {s.name} (₹{s.price})</option>
                ))}
              </select>
              <button type="button" onClick={addService} disabled={!serviceId}
                className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
                + Add
              </button>
            </div>

            {selectedServices.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="pb-2">Code</th>
                    <th className="pb-2">Name</th>
                    <th className="pb-2 text-right">Price</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedServices.map(s => (
                    <tr key={s.id} className="border-b border-gray-50">
                      <td className="py-2 font-mono text-gray-600">{s.code}</td>
                      <td className="py-2 text-gray-800">{s.name}</td>
                      <td className="py-2 text-right font-medium text-gray-900">₹{s.price.toFixed(2)}</td>
                      <td className="py-2 text-right">
                        <button type="button" onClick={() => removeService(s)}
                          className="text-red-400 hover:text-red-600 text-xs">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Total */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Total</h3>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Spares Total</span>
              <span>₹{sparesTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Services Total</span>
              <span>₹{servicesTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 border-t border-gray-100 pt-2">
              <span>Sub Total</span>
              <span>₹{autoTotal.toFixed(2)}</span>
            </div>

            <div className="pt-1">
              <label className="block text-xs text-gray-500 mb-1">Adjusted Grand Total (optional discount)</label>
              <input
                type="number"
                min="0"
                max={autoTotal}
                step="0.01"
                value={adjustedTotalStr}
                onChange={e => setAdjustedTotalStr(e.target.value)}
                placeholder={`₹${autoTotal.toFixed(2)}`}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>- ₹{discount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-semibold text-gray-900 border-t border-gray-100 pt-2">
              <span>Grand Total</span>
              <span>₹{finalTotal.toFixed(2)}</span>
            </div>
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
