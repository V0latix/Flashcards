import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getEnv } from '../config/env'

let cached: SupabaseClient | null = null

export const getSupabase = (): SupabaseClient => {
  if (cached) {
    return cached
  }
  const envResult = getEnv()
  if (!envResult.ok) {
    throw new Error('Supabase env missing')
  }
  cached = createClient(envResult.env.supabaseUrl, envResult.env.supabaseAnonKey)
  return cached
}
