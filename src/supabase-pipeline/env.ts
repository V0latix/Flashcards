import dotenv from 'dotenv'

// Load .env for Node-only scripts (distinct from Vite's .env.local).
dotenv.config()
dotenv.config({ path: '.env.local', override: false })

// Convenience: allow reusing Vite's URL for scripts.
if ((!process.env.SUPABASE_URL || process.env.SUPABASE_URL.trim() === '') && process.env.VITE_SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL
}

