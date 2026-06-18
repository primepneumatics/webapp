import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { useAuth } from '../../hooks/useAuth'

type ServiceType = { id: string; code: string; name: string; price: number }
type Form = { code: string; name: string; price: string }

const empty: Form = { code: '', name: '', price: '' }

export function ServiceTypesList() {
  const navigate = useNavigate()
  const { isAdmin, loading } = useAuth()
  const [services, setServices] = useState<ServiceType[]>([])
  const [form, setForm] = useState<Form>(empty)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Form>(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('service_types').select('*').order('code').then(({ data }) => {
      if (data) setServices(data)
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
    const { data, error } = await supabase.from('service_types').insert({
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      price: parseFloat(form.price),
    }).select().single()

    if (error) { setError(error.message); setSaving(false); return }
    setServices(prev => [...prev, data].sort((a, b) => a.code.localeCompare(b.code)))
    setForm(empty)
    setSaving(false)
  }

  async function handleEdit(id: string) {
    setError('')
    const { error } = await supabase.from('service_types').update({
      code: editForm.code.trim().toUpperCase(),
      name: editForm.name.trim(),
      price: parseFloat(editForm.price),
    }).eq('id', id)

    if (error) { setError(error.message); return }
    setServices(prev => prev.map(s => s.id === id
      ? { ...s, code: editForm.code.toUpperCase(), name: editForm.name, price: parseFloat(editForm.price) }
      : s
    ))
    setEditId(null)
  }

  async function handleDelete(id: string) {
    await supabase.from('service_types').delete().eq('id', id)
    setServices(prev => prev.filter(s => s.id !== id))
  }

  return (
    <Layout>
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">← Back</button>
          <h2 className="text-xl font-semibold text-gray-900">Service Types</h2>
        </div>

        <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Add New Service Type</p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Code *</label>
              <input value={form.code} onChange={set(form, setForm)('code')} required placeholder="e.g. SV001"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name *</label>
              <input value={form.name} onChange={set(form, setForm)('name')} required placeholder="e.g. General Service"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Price (₹) *</label>
              <input type="number" value={form.price} onChange={set(form, setForm)('price')} required min="0" step="0.01" placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          <button type="submit" disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Adding...' : '+ Add'}
          </button>
        </form>

        {services.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-400">No service types added yet.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 font-medium text-gray-600">Code</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Price</th>
                  <th className="px-4 py-3 font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody>
                {services.map(s => (
                  <tr key={s.id} className="border-b border-gray-50">
                    {editId === s.id ? (
                      <>
                        <td className="px-4 py-2"><input value={editForm.code} onChange={set(editForm, setEditForm)('code')}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm" /></td>
                        <td className="px-4 py-2"><input value={editForm.name} onChange={set(editForm, setEditForm)('name')}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm" /></td>
                        <td className="px-4 py-2"><input type="number" value={editForm.price} onChange={set(editForm, setEditForm)('price')}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm" /></td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <button onClick={() => handleEdit(s.id)} className="text-xs text-green-600 hover:underline">Save</button>
                            <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-mono text-gray-700">{s.code}</td>
                        <td className="px-4 py-3 text-gray-900">{s.name}</td>
                        <td className="px-4 py-3 text-gray-600">₹{s.price.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-3">
                            <button onClick={() => { setEditId(s.id); setEditForm({ code: s.code, name: s.name, price: String(s.price) }) }}
                              className="text-xs text-blue-600 hover:underline">Edit</button>
                            <button onClick={() => handleDelete(s.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
