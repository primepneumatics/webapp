import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabaseAdmin } from '../../lib/supabaseAdmin'
import { supabase } from '../../lib/supabase'
import { Layout } from '../../components/Layout'
import { useAuth } from '../../hooks/useAuth'
import { generatePassword, buildInviteLink } from '../../utils/whatsapp'

export function InviteUser() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!isAdmin) return <Navigate to="/dashboard" replace />

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const password = generatePassword()

    const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: phone,
      password,
      email_confirm: true,
    })

    if (createError || !data.user) {
      setError(createError?.message ?? 'Failed to create user.')
      setSaving(false)
      return
    }

    await supabase.from('profiles').insert({
      id: data.user.id,
      phone,
      role: 'user',
    })

    window.open(buildInviteLink(phone, password), '_blank')
    navigate('/dashboard')
  }

  return (
    <Layout>
      <div className="max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
            ← Back
          </button>
          <h2 className="text-xl font-semibold text-gray-900">Invite User</h2>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
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
      </div>
    </Layout>
  )
}
