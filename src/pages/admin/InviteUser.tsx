import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { useAuth } from '../../hooks/useAuth'
import { generatePassword, buildInviteLink, toAuthEmail, normalizePhone } from '../../utils/whatsapp'

type Profile = {
  id: string
  phone: string
  role: string
  created_at: string
}

export function InviteUser() {
  const navigate = useNavigate()
  const { isAdmin, loading } = useAuth()
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [users, setUsers] = useState<Profile[]>([])

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

    const password = generatePassword()
    const normalizedPhone = normalizePhone(phone)

    const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: toAuthEmail(normalizedPhone),
      password,
      email_confirm: true,
    })

    if (createError || !data.user) {
      setError(createError?.message ?? 'Failed to create user.')
      setSaving(false)
      return
    }

    const newProfile: Profile = {
      id: data.user.id,
      phone: normalizedPhone,
      role: 'user',
      created_at: new Date().toISOString(),
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      phone: normalizedPhone,
      role: 'user',
    })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(data.user.id)
      setError('Failed to create user profile. Please try again.')
      setSaving(false)
      return
    }

    setUsers(prev => [newProfile, ...prev])
    setPhone('')
    window.open(buildInviteLink(normalizedPhone, password), '_blank')
    setSaving(false)
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
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600">Phone</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Role</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-50">
                      <td className="px-4 py-3 text-gray-900">{u.phone}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
