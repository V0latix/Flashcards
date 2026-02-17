import './env.js'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Client } from 'pg'
import { isMainModule } from './isMain.js'

function requireEnv(name: string): string {
  const v = process.env[name]
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s) throw new Error(`Missing ${name} in environment`)
  return s
}

export async function reclaimSpacePhase1(): Promise<void> {
  const connectionString = requireEnv('SUPABASE_DB_URL')
  const sqlPath = resolve(process.cwd(), 'supabase/migrations/2026-02-17_reclaim_space_phase1.sql')
  const sql = await readFile(sqlPath, 'utf8')

  const client = new Client({ connectionString })
  await client.connect()
  try {
    await client.query(sql)
  } finally {
    await client.end()
  }
}

if (isMainModule(import.meta.url)) {
  await reclaimSpacePhase1()
  console.log('reclaim_space_phase1=ok')
}
