import { supabase } from '../lib/supabase'
import { toDisplayDate } from './dateEngine'
import { srNum } from './reportNumber'

const CHECKLIST_LABELS: Record<string, string> = {
  air_filter: 'Replaced air filter',
  oil_filter: 'Replaced oil filter',
  oil_level: 'Checked / topped up oil level',
  cooler: 'Cleaned cooler',
  belts: 'Inspected belts / drive',
  air_leaks: 'Checked for air leaks',
}

async function logoDataUrl(): Promise<string> {
  try {
    const res = await fetch('/logo.png')
    const blob = await res.blob()
    return await new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch {
    return ''
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildHtml(report: any, hideRates: boolean, logo: string): string {
  const spares: any[] = report.selected_spares ?? []
  const services: any[] = report.selected_services ?? []
  const sparesTotal: number = spares.reduce((s, x) => s + x.amount, 0)
  const servicesTotal: number = services.reduce((s, x) => s + x.price, 0)
  const grandTotal: number = report.total_amount ?? sparesTotal + servicesTotal
  const hasDiscount = grandTotal < sparesTotal + servicesTotal

  const cell = (content: string, extra = '') =>
    `<td style="padding:6px 8px 6px 0;font-size:13px;color:#374151;${extra}">${content}</td>`

  const ratesDisplay = hideRates ? 'none' : ''

  const sparesRows = spares.map(s => `
    <tr style="border-bottom:1px solid #f9fafb;">
      ${cell(`<span style="font-family:monospace;font-size:11px;color:#6b7280;">${s.code}</span>`)}
      ${cell(s.name)}
      ${cell(String(s.qty), 'text-align:right;')}
      ${cell(`₹${Number(s.unit_price).toFixed(2)}`, `text-align:right;display:${ratesDisplay || 'table-cell'};` + (hideRates ? 'display:none;' : ''))}
      ${cell(`₹${Number(s.amount).toFixed(2)}`, `text-align:right;font-weight:500;` + (hideRates ? 'display:none;' : ''))}
    </tr>`).join('')

  const serviceRows = services.map(s => `
    <tr style="border-bottom:1px solid #f9fafb;">
      ${cell(`<span style="font-family:monospace;font-size:11px;color:#6b7280;">${s.code}</span>`)}
      ${cell(s.name)}
      ${cell(`₹${Number(s.price).toFixed(2)}`, `text-align:right;font-weight:500;` + (hideRates ? 'display:none;' : ''))}
    </tr>`).join('')

  const checklist = Object.entries(report.checklist as Record<string, boolean>)
    .map(([key, done]) => `
      <div style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:4px;">
        <span style="color:${done ? '#16a34a' : '#d1d5db'};">${done ? '✓' : '✗'}</span>
        <span style="color:${done ? '#1f2937' : '#9ca3af'};">${CHECKLIST_LABELS[key] || key}</span>
      </div>`).join('')

  const infoRow = (label: string, value: string) => `
    <div>
      <p style="font-size:11px;color:#6b7280;margin:0 0 2px;">${label}</p>
      <p style="font-size:13px;font-weight:500;color:#111827;margin:0;">${value || '—'}</p>
    </div>`

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:32px;max-width:720px;background:#fff;">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid #f3f4f6;padding-bottom:16px;margin-bottom:24px;">
        <div>
          ${logo ? `<img src="${logo}" style="height:40px;margin-bottom:4px;" />` : '<strong style="font-size:16px;">Prime Pneumatics</strong>'}
          <p style="color:#6b7280;font-size:13px;margin:0;">Service Report</p>
        </div>
        ${report.report_number ? `<p style="font-family:monospace;font-weight:600;color:#374151;font-size:13px;margin:0;">${srNum(report.report_number)}</p>` : ''}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
        ${infoRow('Customer', report.customer.name)}
        ${infoRow('Organisation', report.customer.org)}
        ${infoRow('Phone', report.customer.phone)}
        ${infoRow('GST', report.customer.gst)}
        ${infoRow('Model', report.customer.model)}
        ${infoRow('Report Date', toDisplayDate(report.report_date))}
        ${infoRow('Report No.', report.report_number ? srNum(report.report_number) : '—')}
        ${infoRow('FAB Number', report.fab)}
        ${infoRow('Hours Run', String(report.hours_run))}
        ${infoRow('Hours Until Next', String(report.hours_until_next))}
        ${infoRow('Next Service Date', toDisplayDate(report.next_service_date))}
      </div>

      <p style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">Service Checklist</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:24px;">
        ${checklist}
      </div>

      ${spares.length > 0 ? `
        <p style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">Spare Parts Used</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <thead>
            <tr style="border-bottom:1px solid #f3f4f6;">
              <th style="text-align:left;font-size:11px;color:#9ca3af;padding-bottom:4px;">Code</th>
              <th style="text-align:left;font-size:11px;color:#9ca3af;padding-bottom:4px;">Name</th>
              <th style="text-align:right;font-size:11px;color:#9ca3af;padding-bottom:4px;">Qty</th>
              ${hideRates ? '' : '<th style="text-align:right;font-size:11px;color:#9ca3af;padding-bottom:4px;">Unit Price</th><th style="text-align:right;font-size:11px;color:#9ca3af;padding-bottom:4px;">Amount</th>'}
            </tr>
          </thead>
          <tbody>${sparesRows}</tbody>
        </table>` : ''}

      ${services.length > 0 ? `
        <p style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">Services Performed</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <thead>
            <tr style="border-bottom:1px solid #f3f4f6;">
              <th style="text-align:left;font-size:11px;color:#9ca3af;padding-bottom:4px;">Code</th>
              <th style="text-align:left;font-size:11px;color:#9ca3af;padding-bottom:4px;">Name</th>
              ${hideRates ? '' : '<th style="text-align:right;font-size:11px;color:#9ca3af;padding-bottom:4px;">Price</th>'}
            </tr>
          </thead>
          <tbody>${serviceRows}</tbody>
        </table>` : ''}

      <div style="border-top:1px solid #f3f4f6;padding-top:16px;">
        ${spares.length > 0 && !hideRates ? `<div style="display:flex;justify-content:space-between;font-size:13px;color:#6b7280;margin-bottom:4px;"><span>Spares Total</span><span>₹${sparesTotal.toFixed(2)}</span></div>` : ''}
        ${services.length > 0 && !hideRates ? `<div style="display:flex;justify-content:space-between;font-size:13px;color:#6b7280;margin-bottom:4px;"><span>Services Total</span><span>₹${servicesTotal.toFixed(2)}</span></div>` : ''}
        ${hasDiscount ? `
          <div style="display:flex;justify-content:space-between;font-size:13px;color:#6b7280;border-top:1px solid #f3f4f6;padding-top:4px;margin-bottom:4px;"><span>Subtotal</span><span>₹${(sparesTotal + servicesTotal).toFixed(2)}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:13px;color:#16a34a;margin-bottom:4px;"><span>Discount</span><span>- ₹${(sparesTotal + servicesTotal - grandTotal).toFixed(2)}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:600;color:#111827;border-top:1px solid #f3f4f6;padding-top:4px;"><span>Grand Total</span><span>₹${grandTotal.toFixed(2)}</span></div>
      </div>

      ${report.remarks ? `
        <div style="margin-top:20px;">
          <p style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 4px;">Remarks</p>
          <p style="font-size:13px;color:#374151;margin:0;">${report.remarks}</p>
        </div>` : ''}

      <div style="border-top:1px solid #f3f4f6;margin-top:20px;padding-top:12px;font-size:11px;color:#9ca3af;">
        Filed by: ${report.filed_by?.name ?? report.filed_by?.phone ?? 'Unknown'} on ${toDisplayDate(report.report_date)}
      </div>
    </div>`
}

export async function downloadReportPdf(reportId: string, hideRates = false): Promise<void> {
  const { data: report } = await supabase
    .from('service_reports')
    .select('*, report_number, filed_by_id, customer:customers(name, org, phone, gst, model), filed_by:profiles!filed_by_id(name, phone)')
    .eq('id', reportId)
    .single()

  if (!report) return

  const [html2pdfLib, logo] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import('html2pdf.js').then(m => (m as any).default),
    logoDataUrl(),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = report as any
  const html = buildHtml(r, hideRates, logo)
  const safeName = r.customer.name.replace(/[^a-zA-Z0-9]/g, '-')
  const filename = `${srNum(r.report_number)}_${safeName}_${r.report_date}.pdf`

  await html2pdfLib()
    .set({
      margin: 0,
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .from(html, 'string')
    .save()
}
