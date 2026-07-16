import { useState } from 'react'

type Props = {
  title: string
  warning: string
  confirming?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDeleteModal({ title, warning, confirming, onConfirm, onCancel }: Props) {
  const [input, setInput] = useState('')
  const matches = input.trim().toUpperCase() === 'DELETE'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-red-600 font-medium">{warning}</p>
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Type <span className="font-mono font-semibold">DELETE</span> to confirm
          </label>
          <input
            autoFocus
            value={input}
            onChange={e => setInput(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="DELETE"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!matches || confirming}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
          >
            {confirming ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
