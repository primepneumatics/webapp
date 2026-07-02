import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Layout } from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { stripAuthSuffix } from '../utils/whatsapp'

export function More() {
  const navigate = useNavigate()
  const { isAdmin, role, session, name, phone } = useAuth()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const displayName = name ?? phone ?? (session?.user.email ? stripAuthSuffix(session.user.email) : '—')

  return (
    <Layout>
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="font-semibold text-gray-900 text-sm">{displayName}</p>
          <p className="text-xs text-gray-400 mt-0.5 capitalize">{role ?? 'user'}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          <MenuItem label="Search Reports" onClick={() => navigate('/search')} />
          <MenuItem label="My Profile" onClick={() => navigate('/profile')} />
        </div>

        {isAdmin && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-2">Admin</p>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              <MenuItem label="Invite User" onClick={() => navigate('/admin/invite')} />
              <MenuItem label="Spare Parts" onClick={() => navigate('/admin/spare-parts')} />
              <MenuItem label="Service Types" onClick={() => navigate('/admin/service-types')} />
              <MenuItem label="Settings" onClick={() => navigate('/admin/settings')} />
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3.5 text-left text-sm text-red-600 font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    </Layout>
  )
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 text-sm text-gray-900 active:bg-gray-50"
    >
      <span>{label}</span>
      <span className="text-gray-300 text-base">&#8250;</span>
    </button>
  )
}
