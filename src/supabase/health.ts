import { supabase } from './client'

export async function healthCheckSupabase(): Promise<void> {
  const { error } = await supabase.from('packs').select('slug').limit(1)

  if (error) {
    console.error('Supabase ERROR', error)
    return
  }

  console.log('Supabase OK')
}
