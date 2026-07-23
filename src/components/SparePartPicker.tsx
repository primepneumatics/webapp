import { useEffect, useRef, useState } from 'react'

type SparePart = { id: string; code: string; name: string; size: string | null }

export function SparePartPicker({
  parts, excludeIds, onSelect, placeholder, className,
}: {
  parts: SparePart[]
  excludeIds?: string[]
  onSelect: (part: SparePart) => void
  placeholder?: string
  className?: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const available = parts.filter(p => !excludeIds?.includes(p.id))
  const q = query.trim().toLowerCase()
  const matches = (q
    ? available.filter(p => `${p.code} ${p.name} ${p.size ?? ''}`.toLowerCase().includes(q))
    : available
  ).slice(0, 50)

  function select(part: SparePart) {
    onSelect(part)
    setQuery('')
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || matches.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(i => Math.min(i + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      select(matches[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setHighlighted(0) }}
        onFocus={() => { setOpen(true); setHighlighted(0) }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'Search spare parts by code or name...'}
        autoComplete="off"
        className={className ?? 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'}
      />
      {open && matches.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden max-h-56 overflow-y-auto">
          {matches.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => select(p)}
              className={`w-full text-left px-3 py-2 text-sm ${i === highlighted ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <span className="font-mono text-xs text-gray-400 mr-1.5">{p.code}</span>
              <span className="text-gray-700">{p.name}</span>
              {p.size && <span className="text-gray-400 text-xs ml-1">({p.size})</span>}
            </button>
          ))}
        </div>
      )}
      {open && q && matches.length === 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 px-3 py-2 text-sm text-gray-400">
          No matching spare parts.
        </div>
      )}
    </div>
  )
}
