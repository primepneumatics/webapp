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

  useEffect(() => {
    if (!session) return
    supabase
      .from('profiles')
      .select('name, phone, role, created_at')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setProfile(data)
        setLoading(false)
      })
  }, [session])

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
            {profile.name && <Row label="Name" value={profile.name} />}
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
