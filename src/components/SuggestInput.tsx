import { useEffect, useRef, useState } from 'react'

export function SuggestInput({
  value, onChange, suggestions, placeholder, className,
}: {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const query = value.trim().toLowerCase()
  const matches = query
    ? suggestions.filter(s => s.toLowerCase().includes(query) && s.toLowerCase() !== query).slice(0, 6)
    : []

  function select(name: string) {
    onChange(name)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={className ?? "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"}
      />
      {open && matches.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden max-h-48 overflow-y-auto">
          {matches.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => select(s)}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
