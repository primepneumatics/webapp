import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { useAuth } from '../../hooks/useAuth'

type SparePart = { id: string; code: string; name: string }
type Form = { code: string; name: string }

const empty: Form = { code: '', name: '' }

export function SparePartsList() {
  const navigate = useNavigate()
  const { isAdmin, loading } = useAuth()
  const [parts, setParts] = useState<SparePart[]>([])
  const [form, setForm] = useState<Form>(empty)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Form>(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('spare_parts').select('*').order('code').then(({ data }) => {
      if (data) setParts(data)
    })
  }, [])

  if (loading) return null
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  function set(f: Form, setter: (f: Form) => void) {
    return (field: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setter({ ...f, [field]: e.target.value })
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const { data, error } = await supabase.from('spare_parts').insert({
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
    }).select().single()

    if (error) { setError(error.message); setSaving(false); return }
    setParts(prev => [...prev, data].sort((a, b) => a.code.localeCompare(b.code)))
    setForm(empty)
    setSaving(false)
  }

  async function handleEdit(id: string) {
    setError('')
    const { error } = await supabase.from('spare_parts').update({
      code: editForm.code.trim().toUpperCase(),
      name: editForm.name.trim(),
    }).eq('id', id)

    if (error) { setError(error.message); return }
    setParts(prev => prev.map(p => p.id === id
      ? { ...p, code: editForm.code.toUpperCase(), name: editForm.name }
      : p
    ))
    setEditId(null)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this spare part? This cannot be undone.')) return
    const { error } = await supabase.from('spare_parts').delete().eq('id', id)
    if (error) { setError(error.message); return }
    setParts(prev => prev.filter(p => p.id !== id))
  }

  return (
    <Layout>
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">← Back</button>
          <h2 className="text-xl font-semibold text-gray-900">Spare Parts</h2>
        </div>

        <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Add New Spare Part</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Code *</label>
              <input value={form.code} onChange={set(form, setForm)('code')} required placeholder="e.g. SP001"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name *</label>
              <input value={form.name} onChange={set(form, setForm)('name')} required placeholder="e.g. Air Filter"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          <button type="submit" disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Adding...' : '+ Add'}
          </button>
        </form>

        {parts.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-400">No spare parts added yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {parts.map(p => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
                {editId === p.id ? (
                  <div className="space-y-2">
                    <input value={editForm.code} onChange={set(editForm, setEditForm)('code')} placeholder="Code"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input value={editForm.name} onChange={set(editForm, setEditForm)('name')} placeholder="Name"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleEdit(p.id)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium">Save</button>
                      <button onClick={() => setEditId(null)} className="px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg text-xs">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-xs text-gray-400">{p.code}</span>
                        <span className="text-sm font-medium text-gray-900 truncate">{p.name}</span>
                      </div>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button onClick={() => { setEditId(p.id); setEditForm({ code: p.code, name: p.name }) }}
                        className="text-xs text-blue-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(p.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
