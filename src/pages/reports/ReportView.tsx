import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { toDisplayDate } from '../../utils/dateEngine'
import { srNum } from '../../utils/reportNumber'
import { downloadPdf } from '../../utils/downloadPdf'
import { Layout } from '../../components/Layout'

type SelectedSpare = { id: string; code: string; name: string; qty: number }
type ReportPart = {
  spare_part_id: string
  hours_run: number
  next_hours: number
  hours_per_day: number
  remaining_hours: number
  due_date: string
  maintenance_days: number
  spare_part: { code: string; name: string }
}

type Report = {
  id: string
  report_number: number
  service_id: string
  filed_by_id: string | null
  report_date: string
  total_run_hours: number
  remarks: string
  serviced_by: string | null
  due_service_date: string | null
  selected_spares: SelectedSpare[]
  service: { fab_number: string; model_number: string | null; sponsor: string | null; customer: { name: string; org: string; phone: string; gst: string } }
  filed_by: { name: string | null; phone: string } | null
}

export function ReportView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [report, setReport] = useState<Report | null>(null)
  const [parts, setParts] = useState<ReportPart[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    Promise.all([
      supabase
        .from('service_reports')
        .select('*, service:services(fab_number, model_number, sponsor, customer:customers(name, org, phone, gst)), filed_by:profiles!filed_by_id(name, phone)')
        .eq('id', id)
        .single(),
      supabase.from('service_report_parts').select('*, spare_part:spare_parts(code, name)').eq('service_report_id', id),
    ]).then(([{ data }, { data: partsData }]) => {
      setReport(data as unknown as Report)
      if (partsData) setParts(partsData)
      setLoading(false)
    })
  }, [id])

  async function handleDownload() {
    setMenuOpen(false)
    if (!printRef.current) return
    setDownloading(true)
    await downloadPdf(printRef.current, `${report?.report_number ? srNum(report.report_number) : 'service-report'}.pdf`)
    setDownloading(false)
  }

  if (loading) return <Layout><p className="text-gray-400 text-sm">Loading...</p></Layout>
  if (!report) return <Layout><p className="text-red-500 text-sm">Report not found.</p></Layout>

  const spares: SelectedSpare[] = report.selected_spares ?? []

  const reportCard = (
    <div ref={printRef} className="bg-white p-8 print:p-0 print:pb-2 space-y-6 print:space-y-4">
      <div className="border-b border-gray-100 pb-4 flex items-end justify-between">
        <div>
          <img src="/logo.png" alt="Prime Pneumatics & Consultants" className="h-10 w-auto mb-1" />
          <p className="text-sm text-gray-500">Service Report</p>
        </div>
        {report.report_number && (
          <p className="text-sm font-mono font-semibold text-gray-700">{srNum(report.report_number)}</p>
        )}
      </div>

      <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <InfoRowPair
            a={{ label: 'Customer', value: report.service.customer.name }}
            b={{ label: 'Company Name', value: report.service.customer.org }}
          />
          <InfoRowPair
            a={{ label: 'Customer Number', value: report.service.customer.phone }}
            b={{ label: 'GST', value: report.service.customer.gst }}
          />
          <InfoRowPair
            a={{ label: 'FAB Number', value: report.service.fab_number }}
            b={{ label: 'Model Number', value: report.service.model_number ?? '' }}
          />
          <InfoRowPair
            a={{ label: 'Report Date', value: toDisplayDate(report.report_date) }}
            b={{ label: 'Report No.', value: report.report_number ? srNum(report.report_number) : '—' }}
          />
          <InfoRowPair
            a={{ label: 'Total Machine Run', value: `${report.total_run_hours} hrs` }}
            b={{ label: 'Sponsor', value: report.service.sponsor ?? '' }}
          />
          <InfoRowPair
            a={{ label: 'Due Service Date', value: report.due_service_date ? toDisplayDate(report.due_service_date) : '' }}
            b={{ label: 'Service By', value: report.serviced_by ?? '' }}
          />
        </tbody>
      </table>

      {parts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Spare Part Status</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="pb-1">Part</th>
                <th className="pb-1 text-right">Hours Run</th>
                <th className="pb-1 text-right">Next Hours</th>
                <th className="pb-1 text-right">Remaining Hrs</th>
                <th className="pb-1 text-right">Maint. Days</th>
                <th className="pb-1 text-right">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {parts.map(p => (
                <tr key={p.spare_part_id} className="border-b border-gray-50">
                  <td className="py-1.5 text-gray-800">
                    <span className="font-mono text-gray-400 text-xs mr-1">{p.spare_part.code}</span>{p.spare_part.name}
                  </td>
                  <td className="py-1.5 text-right text-gray-600">{p.hours_run}</td>
                  <td className="py-1.5 text-right text-gray-600">{p.next_hours}</td>
                  <td className={`py-1.5 text-right font-medium ${p.remaining_hours <= 0 ? 'text-red-600' : 'text-gray-900'}`}>{p.remaining_hours}</td>
                  <td className="py-1.5 text-right text-gray-600">{p.maintenance_days}</td>
                  <td className="py-1.5 text-right text-gray-600">{toDisplayDate(p.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {spares.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Spare Parts Used</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="pb-1">Spare Part</th><th className="pb-1 text-right">Qty</th>
              </tr>
            </thead>
            <tbody>
              {spares.map(s => (
                <tr key={s.id} className="border-b border-gray-50">
                  <td className="py-1.5 text-gray-800"><span className="font-mono text-gray-400 text-xs mr-1">{s.code}</span>{s.name}</td>
                  <td className="py-1.5 text-right text-gray-600">{s.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
            <button onClick={() => navigate(`/services/${report.service_id}`)} className="text-gray-400 hover:text-gray-600">← Back</button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Service Report</h2>
              {report.report_number && <p className="text-xs text-gray-400 font-mono">{srNum(report.report_number)}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/services/${report.service_id}/reports`)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Report History
            </button>
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-1.5"
              >
                Download
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z" /></svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                  <button
                    onClick={() => { setMenuOpen(false); window.print() }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Print
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100 disabled:opacity-50"
                  >
                    {downloading ? 'Preparing PDF...' : 'Download PDF'}
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

function InfoRowPair({ a, b }: { a: { label: string; value: string }; b: { label: string; value: string } }) {
  return (
    <tr>
      <td className="align-top pr-4 pb-3 w-1/2">
        <InfoRow label={a.label} value={a.value} />
      </td>
      {!b.label && !b.value ? (
        <td className="align-top pb-3 w-1/2" />
      ) : (
        <td className="align-top pb-3 w-1/2">
          <InfoRow label={b.label} value={b.value} />
        </td>
      )}
    </tr>
  )
}
