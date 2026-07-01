import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { useAuth } from '../../hooks/useAuth'
import { DEFAULT_REMINDER_TEMPLATE } from '../../utils/reminderTemplate'

export function AdminSettings() {
  const navigate = useNavigate()
  const { isAdmin, loading } = useAuth()
  const [template, setTemplate] = useState(DEFAULT_REMINDER_TEMPLATE)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'reminder_template')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setTemplate(data.value)
        setFetching(false)
      })
  }, [])

  if (loading) return null
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase
      .from('settings')
      .upsert({ key: 'reminder_template', value: template })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Layout>
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 text-sm mb-3 block">
          &larr; Back
        </button>
        <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">WhatsApp Reminder Message</h3>
        <p className="text-xs text-gray-400 mb-4">
          Available variables: <span className="font-mono">{'{name}'}</span>,{' '}
          <span className="font-mono">{'{model}'}</span>,{' '}
          <span className="font-mono">{'{date}'}</span>
        </p>
        {fetching ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <textarea
              value={template}
              onChange={e => setTemplate(e.target.value)}
              rows={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              {saved && <span className="text-sm text-green-600">Saved</span>}
            </div>
          </form>
        )}
      </div>
    </Layout>
  )
}
