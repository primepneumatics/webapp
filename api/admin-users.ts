import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { generatePassword, toAuthEmail } from '../src/utils/whatsapp.js'

const url = process.env.VITE_SUPABASE_URL as string
const anonKey = process.env.VITE_SUPABASE_ANON_KEY as string
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

async function requireAdmin(req: VercelRequest) {
  const authHeader = req.headers.authorization ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) return null

  const anon = createClient(url, anonKey)
  const { data: userData, error: userError } = await anon.auth.getUser(token)
  if (userError || !userData.user) return null

  const { data: profile } = await admin.from('profiles').select('role').eq('id', userData.user.id).single()
  if (profile?.role !== 'admin') return null

  return userData.user
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const caller = await requireAdmin(req)
  if (!caller) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  const { action, phone, name, userId } = req.body ?? {}

  try {
    if (action === 'create') {
      const password = generatePassword()
      const { data, error } = await admin.auth.admin.createUser({
        email: toAuthEmail(phone),
        password,
        email_confirm: true,
      })
      if (error || !data.user) {
        res.status(400).json({ error: error?.message ?? 'Failed to create engineer.' })
        return
      }

      const { error: profileError } = await admin.from('profiles').insert({
        id: data.user.id,
        phone,
        role: 'engineer',
        ...(name?.trim() ? { name: name.trim() } : {}),
      })
      if (profileError) {
        await admin.auth.admin.deleteUser(data.user.id)
        res.status(400).json({ error: 'Failed to create engineer profile.' })
        return
      }

      res.status(200).json({ id: data.user.id, password })
      return
    }

    if (action === 'resetPassword') {
      const password = generatePassword()
      const { error } = await admin.auth.admin.updateUserById(userId, { password })
      if (error) {
        res.status(400).json({ error: error.message })
        return
      }
      res.status(200).json({ password })
      return
    }

    if (action === 'deleteUser') {
      // profiles.id -> auth.users(id) is ON DELETE CASCADE, so deleting the
      // auth user removes the profile row too. No need to delete it separately.
      const { error } = await admin.auth.admin.deleteUser(userId)
      if (error) {
        res.status(400).json({ error: error.message })
        return
      }
      res.status(200).json({ success: true })
      return
    }

    res.status(400).json({ error: 'Unknown action' })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}
