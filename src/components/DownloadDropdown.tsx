import { useRef, useState } from 'react'
import { downloadReportPdf } from '../utils/downloadReport'

export function DownloadDropdown({ reportId, className }: { reportId: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  async function handle(hideRates: boolean) {
    setOpen(false)
    setBusy(true)
    try {
      await downloadReportPdf(reportId, hideRates)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <button
        disabled={busy}
        onClick={() => setOpen(v => !v)}
        className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center gap-1"
      >
        {busy ? 'Downloading…' : 'Download'}
        {!busy && <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z" /></svg>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
            <button onClick={() => handle(false)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              Full Report
            </button>
            <button onClick={() => handle(true)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100">
              No Rates
            </button>
          </div>
        </>
      )}
    </div>
  )
}
