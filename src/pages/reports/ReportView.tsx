import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { toDisplayDate } from '../../utils/dateEngine'
import { srNum } from '../../utils/reportNumber'
import { Layout } from '../../components/Layout'

type SelectedSpare = { id: string; code: string; name: string; qty: number; unit_price: number; amount: number }
type SelectedService = { id: string; code: string; name: string; price: number }

type Report = {
  id: string
  report_number: number
  customer_id: string
  filed_by_id: string | null
  report_date: string
  fab: string
  remarks: string
  hours_run: number
  hours_until_next: number
  maintenance_days: number | null
  total_amount: number
  next_service_date: string
  selected_spares: SelectedSpare[]
  selected_services: SelectedService[]
  customer: { name: string; org: string; phone: string; gst: string; model: string }
  filed_by: { name: string | null; phone: string } | null
}

function printNoRates() {
  const style = document.createElement('style')
  style.textContent = '.rates-col { display: none !important; }'
  document.head.appendChild(style)

  let cleaned = false
  function cleanup() {
    if (cleaned) return
    cleaned = true
    style.remove()
    window.removeEventListener('afterprint', cleanup)
  }

  // window.print() blocks on desktop but not on most mobile browsers, so
  // removing the style right after calling it (as we used to) stripped the
  // hidden-rates style before the print sheet ever rendered on mobile.
  // afterprint fires once printing is actually done on both, with a
  // fallback timeout in case a mobile browser never fires it.
  window.addEventListener('afterprint', cleanup)
  setTimeout(cleanup, 60000)

  window.print()
}

export function ReportView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [printOpen, setPrintOpen] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (printRef.current && !printRef.current.contains(e.target as Node)) setPrintOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    supabase
      .from('service_reports')
      .select('*, report_number, filed_by_id, customer:customers(name, org, phone, gst, model), filed_by:profiles!filed_by_id(name, phone)')
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

  const reportCard = (
    <div className="bg-white p-8 print:p-0 print:pb-2 space-y-6 print:space-y-4">
      <div className="border-b border-gray-100 pb-4 flex items-end justify-between">
        <div>
          <img src="/logo.png" alt="Prime Pneumatics & Consultants" className="h-10 w-auto mb-1" />
          <p className="text-sm text-gray-500">Service Report</p>
        </div>
        {report.report_number && (
          <p className="text-sm font-mono font-semibold text-gray-700">{srNum(report.report_number)}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <InfoRow label="Customer" value={report.customer.name} />
        <InfoRow label="Company Name" value={report.customer.org} />
        <InfoRow label="Customer Number" value={report.customer.phone} />
        <InfoRow label="GST" value={report.customer.gst} />
        <InfoRow label="Compressor Model" value={report.customer.model} />
        <InfoRow label="Report Date" value={toDisplayDate(report.report_date)} />
        <InfoRow label="Report No." value={report.report_number ? srNum(report.report_number) : '—'} />
        <InfoRow label="FAB Number" value={report.fab} />
        <InfoRow label="Service Engineer" value={report.filed_by?.name ?? report.filed_by?.phone ?? '—'} />
        <InfoRow label="Hours Run" value={String(report.hours_run)} />
        <InfoRow label="Hours Until Next" value={String(report.hours_until_next)} />
        <InfoRow label="Next Service Date" value={toDisplayDate(report.next_service_date)} />
        {report.maintenance_days != null && (
          <InfoRow label="Maintenance Days" value={String(report.maintenance_days)} />
        )}
      </div>

      {spares.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Spare Parts Used</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="pb-1">Code</th><th className="pb-1">Name</th>
                <th className="pb-1 text-right">Qty</th>
                <th className="pb-1 text-right rates-col">Unit Price</th>
                <th className="pb-1 text-right rates-col">Amount</th>
              </tr>
            </thead>
            <tbody>
              {spares.map(s => (
                <tr key={s.id} className="border-b border-gray-50">
                  <td className="py-1.5 font-mono text-gray-600 text-xs">{s.code}</td>
                  <td className="py-1.5 text-gray-800">{s.name}</td>
                  <td className="py-1.5 text-right text-gray-600">{s.qty}</td>
                  <td className="py-1.5 text-right text-gray-600 rates-col">₹{s.unit_price.toFixed(2)}</td>
                  <td className="py-1.5 text-right font-medium text-gray-900 rates-col">₹{s.amount.toFixed(2)}</td>
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
                <th className="pb-1 text-right rates-col">Price</th>
              </tr>
            </thead>
            <tbody>
              {services.map(s => (
                <tr key={s.id} className="border-b border-gray-50">
                  <td className="py-1.5 font-mono text-gray-600 text-xs">{s.code}</td>
                  <td className="py-1.5 text-gray-800">{s.name}</td>
                  <td className="py-1.5 text-right font-medium text-gray-900 rates-col">₹{s.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t border-gray-100 pt-4 space-y-1 rates-col">
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
        {grandTotal < sparesTotal + servicesTotal && (
          <>
            <div className="flex justify-between text-sm text-gray-500 border-t border-gray-100 pt-1">
              <span>Subtotal</span><span>₹{(sparesTotal + servicesTotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span><span>- ₹{(sparesTotal + servicesTotal - grandTotal).toFixed(2)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between text-sm font-semibold text-gray-900 border-t border-gray-100 pt-1">
          <span>Grand Total</span><span>₹{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {report.remarks && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Remarks</p>
          <p className="text-sm text-gray-700">{report.remarks}</p>
        </div>
      )}
    </div>
  )

  return (
    <Layout>
      <div className="max-w-2xl print:mx-auto">
        <div className="flex items-center justify-between mb-6 no-print">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/customers/${report.customer_id}`)} className="text-gray-400 hover:text-gray-600">← Back</button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Service Report</h2>
              {report.report_number && <p className="text-xs text-gray-400 font-mono">{srNum(report.report_number)}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/customers/${report.customer_id}/reports`)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Report History
            </button>
            <div ref={printRef} className="relative">
              <button
                onClick={() => setPrintOpen(v => !v)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-1.5"
              >
                Download
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z" /></svg>
              </button>
              {printOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                  <button
                    onClick={() => { setPrintOpen(false); window.print() }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Full Report
                  </button>
                  <button
                    onClick={() => { setPrintOpen(false); printNoRates() }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100"
                  >
                    No Rates
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="border border-gray-200 rounded-xl overflow-hidden print:border-0 print:rounded-none">
          {reportCard}
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
