import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import './env.js'
import { createClient } from '@supabase/supabase-js'
import { OUT_DEPARTEMENTS_DIR } from './paths.js'
import { isMainModule } from './isMain.js'

type MetaFile = {
  generated_at: string
  metas: Record<string, { code: string; name: string }>
}

function requireEnv(name: string): string {
  const v = process.env[name]
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s) throw new Error(`Missing ${name} in environment`)
  return s
}

export async function seedDepartementsTable(): Promise<{ upserted: number }> {
  const supabaseUrl = requireEnv('SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const metaRaw = await readFile(join(OUT_DEPARTEMENTS_DIR, 'departements.meta.json'), 'utf8')
  const meta = JSON.parse(metaRaw) as MetaFile
  const codes = Object.keys(meta.metas).sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }))

  const rows = codes.map((code) => ({
    numero: code,
    nom: meta.metas[code].name
  }))

  const chunkSize = 200
  let upserted = 0
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const res = await supabase.from('departements').upsert(chunk, { onConflict: 'numero' })
    if (res.error) throw new Error(`departements upsert failed (${i}): ${res.error.message}`)
    upserted += chunk.length
  }

  return { upserted }
}

if (isMainModule(import.meta.url)) {
  const res = await seedDepartementsTable()
  console.log(`departements_upserted=${res.upserted}`)
}
