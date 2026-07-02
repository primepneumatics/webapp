import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Layout } from '../components/Layout'
import { useAuth } from '../hooks/useAuth'

type ProfileData = {
  name: string | null
  phone: string
  role: string
  created_at: string
}

export function Profile() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!session) return
    supabase
      .from('profiles')
      .select('name, phone, role, created_at')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setProfile(data)
        setNameInput(data?.name ?? '')
        setLoading(false)
      })
  }, [session])

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    if (!session) return
    setSaving(true)
    setSaveError('')
    const { error } = await supabase.from('profiles').update({ name: nameInput.trim() || null }).eq('id', session.user.id)
    if (error) {
      setSaveError(error.message)
      setSaving(false)
      return
    }
    setProfile(p => p ? { ...p, name: nameInput.trim() || null } : p)
    setEditing(false)
    setSaving(false)
  }

  return (
    <Layout>
      <div className="max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
            ← Back
          </button>
          <h2 className="text-xl font-semibold text-gray-900">My Profile</h2>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : !profile ? (
          <p className="text-red-500 text-sm">Profile not found.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            {editing ? (
              <form onSubmit={handleSaveName} className="space-y-3">
                <label className="block text-sm text-gray-500">Name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  placeholder="Your name"
                  style={{ fontSize: '16px' }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {saveError && <p className="text-xs text-red-600">{saveError}</p>}
                <div className="flex gap-3">
                  <button type="submit" disabled={saving}
                    className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" onClick={() => { setEditing(false); setNameInput(profile.name ?? ''); setSaveError('') }}
                    className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 w-36 shrink-0">Name</span>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm text-gray-900">{profile.name || <span className="text-gray-400 italic">Not set</span>}</span>
                  <button onClick={() => setEditing(true)}
                    className="text-xs text-blue-600 hover:underline ml-auto">
                    Edit
                  </button>
                </div>
              </div>
            )}
            <Row label="Phone Number" value={profile.phone} />
            <Row label="Role" value={profile.role} badge />
            <Row label="Member Since" value={new Date(profile.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
          </div>
        )}
      </div>
    </Layout>
  )
}

function Row({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-500 w-36 shrink-0">{label}</span>
      {badge ? (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          value === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {value}
        </span>
      ) : (
        <span className="text-sm text-gray-900">{value}</span>
      )}
    </div>
  )
}
