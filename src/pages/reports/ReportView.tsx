import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useReactToPrint } from 'react-to-print'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { useAuth } from '../../hooks/useAuth'

const CHECKLIST_LABELS: Record<string, string> = {
  air_filter: 'Replaced air filter',
  oil_filter: 'Replaced oil filter',
  oil_level: 'Checked / topped up oil level',
  cooler: 'Cleaned cooler',
  belts: 'Inspected belts / drive',
  air_leaks: 'Checked for air leaks',
}

type SelectedSpare = { id: string; code: string; name: string; qty: number; unit_price: number; amount: number }
type SelectedService = { id: string; code: string; name: string; price: number }

type Report = {
  id: string
  customer_id: string
  report_date: string
  fob: string
  remarks: string
  hours_run: number
  hours_until_next: number
  total_amount: number
  next_service_date: string
  checklist: Record<string, boolean>
  selected_spares: SelectedSpare[]
  selected_services: SelectedService[]
  customer: { name: string; org: string; phone: string; gst: string; model: string }
}

export function ReportView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { phone: userPhone, name: userName } = useAuth()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({ contentRef: printRef })

  useEffect(() => {
    supabase
      .from('service_reports')
      .select('*, customer:customers(name, org, phone, gst, model)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setReport(data as unknown as Report)
        setLoading(false)
      })
  }, [id])

  if (loading) return <Layout><p className="text-gray-400 text-sm">Loading...</p></Layout>
  if (!report) return <Layout><p className="text-red-500 text-sm">Report not found.</p></Layout>

  const spares: SelectedSpare[] = report.selected_spares ?? []
  const services: SelectedService[] = report.selected_services ?? []
  const sparesTotal = spares.reduce((sum, s) => sum + s.amount, 0)
  const servicesTotal = services.reduce((sum, s) => sum + s.price, 0)
  const grandTotal = report.total_amount ?? (sparesTotal + servicesTotal)

  return (
    <Layout>
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-6 no-print">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/customers/${report.customer_id}`)} className="text-gray-400 hover:text-gray-600">← Back</button>
            <h2 className="text-xl font-semibold text-gray-900">Service Report</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/customers/${report.customer_id}/reports`)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Report History
            </button>
            <button onClick={() => handlePrint()}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
              Print
            </button>
          </div>
        </div>

        <div ref={printRef} className="bg-white border border-gray-200 rounded-xl p-8 space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h1 className="text-lg font-bold text-gray-900">Prime Pneumatics</h1>
            <p className="text-sm text-gray-500">Service Report</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <InfoRow label="Customer" value={report.customer.name} />
            <InfoRow label="Organisation" value={report.customer.org} />
            <InfoRow label="Phone" value={report.customer.phone} />
            <InfoRow label="GST" value={report.customer.gst} />
            <InfoRow label="Model" value={report.customer.model} />
            <InfoRow label="Report Date" value={report.report_date} />
            <InfoRow label="FOB Number" value={report.fob} />
            <InfoRow label="Hours Run" value={String(report.hours_run)} />
            <InfoRow label="Hours Until Next" value={String(report.hours_until_next)} />
            <InfoRow label="Next Service Date" value={report.next_service_date} />
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Service Checklist</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(report.checklist).map(([key, done]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <span className={done ? 'text-green-600' : 'text-gray-300'}>{done ? '✓' : '✗'}</span>
                  <span className={done ? 'text-gray-800' : 'text-gray-400'}>{CHECKLIST_LABELS[key] || key}</span>
                </div>
              ))}
            </div>
          </div>

          {spares.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Spare Parts Used</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-1">Code</th><th className="pb-1">Name</th>
                    <th className="pb-1 text-right">Qty</th>
                    <th className="pb-1 text-right">Unit Price</th>
                    <th className="pb-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {spares.map(s => (
                    <tr key={s.id} className="border-b border-gray-50">
                      <td className="py-1.5 font-mono text-gray-600 text-xs">{s.code}</td>
                      <td className="py-1.5 text-gray-800">{s.name}</td>
                      <td className="py-1.5 text-right text-gray-600">{s.qty}</td>
                      <td className="py-1.5 text-right text-gray-600">₹{s.unit_price.toFixed(2)}</td>
                      <td className="py-1.5 text-right font-medium text-gray-900">₹{s.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {services.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Services Performed</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-1">Code</th><th className="pb-1">Name</th>
                    <th className="pb-1 text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map(s => (
                    <tr key={s.id} className="border-b border-gray-50">
                      <td className="py-1.5 font-mono text-gray-600 text-xs">{s.code}</td>
                      <td className="py-1.5 text-gray-800">{s.name}</td>
                      <td className="py-1.5 text-right font-medium text-gray-900">₹{s.price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4 space-y-1">
            {spares.length > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Spares Total</span><span>₹{sparesTotal.toFixed(2)}</span>
              </div>
            )}
            {services.length > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Services Total</span><span>₹{servicesTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold text-gray-900 pt-1">
              <span>Grand Total</span><span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {report.remarks && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Remarks</p>
              <p className="text-sm text-gray-700">{report.remarks}</p>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4 text-xs text-gray-400">
            Filed by: {userName ?? userPhone ?? 'Unknown'} on {report.report_date}
          </div>
        </div>
      </div>
    </Layout>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
    </div>
  )
}
