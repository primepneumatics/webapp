import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { useAuth } from '../../hooks/useAuth'
import { buildInviteLink, normalizePhone } from '../../utils/whatsapp'

async function callAdminApi(accessToken: string | undefined, body: Record<string, unknown>) {
  const res = await fetch('/api/admin-users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken ?? ''}` },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Request failed')
  return json
}

type Profile = {
  id: string
  phone: string
  role: string
  created_at: string
}

export function InviteUser() {
  const navigate = useNavigate()
  const { isAdmin, loading, session } = useAuth()
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [users, setUsers] = useState<Profile[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, phone, role, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setUsers(data) })
  }, [])

  if (loading) return null
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const normalizedPhone = normalizePhone(phone)

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', normalizedPhone)
      .maybeSingle()

    if (existing) {
      setError('A user with this phone number already exists.')
      setSaving(false)
      return
    }

    try {
      const { id, password } = await callAdminApi(session?.access_token, {
        action: 'create',
        phone: normalizedPhone,
        name,
      })

      const newProfile: Profile = {
        id,
        phone: normalizedPhone,
        role: 'user',
        created_at: new Date().toISOString(),
      }

      setUsers(prev => [newProfile, ...prev])
      setPhone('')
      setName('')
      window.open(buildInviteLink(normalizedPhone, password), '_blank')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user.')
    } finally {
      setSaving(false)
    }
  }

  async function handleResetPassword(user: Profile) {
    if (!window.confirm(`Reset password for ${user.phone}? A new password will be generated and WhatsApp will open.`)) return
    setResettingId(user.id)
    try {
      const { password } = await callAdminApi(session?.access_token, { action: 'resetPassword', userId: user.id })
      window.open(buildInviteLink(user.phone, password), '_blank')
    } catch {
      alert('Failed to reset password. Please try again.')
    } finally {
      setResettingId(null)
    }
  }

  async function handleDelete(user: Profile) {
    if (user.id === session?.user.id) {
      alert('You cannot delete your own account.')
      return
    }
    if (!window.confirm(`Delete user ${user.phone}? This will revoke their access immediately.`)) return
    setDeletingId(user.id)
    try {
      await callAdminApi(session?.access_token, { action: 'deleteUser', userId: user.id })
      setUsers(prev => prev.filter(u => u.id !== user.id))
    } catch {
      alert('Failed to delete user. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
            ← Back
          </button>
          <h2 className="text-xl font-semibold text-gray-900">Invite User</h2>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <p className="text-sm text-gray-500 mb-6">
            Enter the new user's phone number. A password will be generated and WhatsApp will open
            so you can send their login credentials.
          </p>

          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Staff member's name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                placeholder="e.g. 919876543210 (with country code)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Include country code without + (e.g. 919876543210 for India)</p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Creating account...' : 'Create & Open WhatsApp'}
            </button>
          </form>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Users ({users.length})</h3>
          {users.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <p className="text-sm text-gray-400">No users yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-900">{u.phone}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {u.role}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Added {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button
                      onClick={() => handleResetPassword(u)}
                      disabled={resettingId === u.id}
                      className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                    >
                      {resettingId === u.id ? 'Resetting...' : 'Reset Password'}
                    </button>
                    {u.id !== session?.user.id && (
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={deletingId === u.id}
                        className="text-xs text-red-500 hover:underline disabled:opacity-50"
                      >
                        {deletingId === u.id ? 'Deleting...' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
