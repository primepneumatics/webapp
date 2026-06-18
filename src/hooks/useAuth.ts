import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type Profile = { role: string; phone: string }

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('role, phone').eq('id', userId).single()
  return data ?? null
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session) setProfile(await fetchProfile(data.session.user.id))
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setProfile(session ? await fetchProfile(session.user.id) : null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { session, loading, role: profile?.role ?? null, phone: profile?.phone ?? null, isAdmin: profile?.role === 'admin' }
}
