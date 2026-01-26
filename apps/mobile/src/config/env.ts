type Env = {
  supabaseUrl: string
  supabaseAnonKey: string
}

type EnvResult =
  | { ok: true; env: Env }
  | { ok: false; errors: string[] }

let cached: EnvResult | null = null

const loadEnv = (): EnvResult => {
  const errors: string[] = []
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? ''
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''

  if (!supabaseUrl) {
    errors.push('Missing EXPO_PUBLIC_SUPABASE_URL')
  }
  if (!supabaseAnonKey) {
    errors.push('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY')
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    env: { supabaseUrl, supabaseAnonKey }
  }
}

export const getEnv = (): EnvResult => {
  if (!cached) {
    cached = loadEnv()
  }
  return cached
}
