import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
// WARNING: service role key bypasses RLS — only use server-side or in admin-only flows
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false, storageKey: 'sb-admin' },
})
