import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import './env.js'
import { Client } from 'pg'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { OUT_DIR } from './paths.js'
import type { RenderMeta } from './types.js'
import { isMainModule } from './isMain.js'
import { assertDbUrlMatchesUrl, assertServiceRoleKeyMatchesUrl } from './supabaseAuth.js'
import { setDefaultResultOrder } from 'node:dns'

const TABLE = 'countries'
const BUCKET = 'country-maps'

function requireEnv(name: string): string {
  const v = process.env[name]
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s) throw new Error(`Missing ${name} in environment`)
  return s
}

function publicUrlFor(supabaseUrl: string, iso2: string, version?: string): string {
  const base = supabaseUrl.replace(/\/$/, '')
  const url = `${base}/storage/v1/object/public/${BUCKET}/svg/${iso2}.svg`
  // Cache busting: Supabase CDN caches objects; when we overwrite the same path,
  // some clients may see a mix of old/new images for a few minutes.
  return version ? `${url}?v=${encodeURIComponent(version)}` : url
}

async function ensureCountriesTable(): Promise<void> {
  const connectionString = requireEnv('SUPABASE_DB_URL')
  const supabaseUrl = requireEnv('SUPABASE_URL')
  assertDbUrlMatchesUrl(supabaseUrl, connectionString)
  // Some environments resolve Supabase DB hosts to IPv6 first; prefer IPv4 to avoid EHOSTUNREACH on IPv6-less networks.
  setDefaultResultOrder('ipv4first')
  const u = new URL(connectionString)
  const isSupabaseHost = u.hostname.endsWith('.supabase.co') || u.hostname.endsWith('.supabase.com')
  const hasSslParam = u.searchParams.has('sslmode') || u.searchParams.has('ssl')

  // Node-postgres doesn't fully honor libpq's defaults; ensure SSL on Supabase if missing.
  const ssl =
    isSupabaseHost && !hasSslParam
      ? ({ rejectUnauthorized: false } as const)
      : undefined

  const client = new Client({ connectionString, ssl, family: 4 } as unknown as Record<string, unknown>)
  try {
    await client.connect()
  } catch (err) {
    const host = (() => {
      try {
        return new URL(connectionString).hostname
      } catch {
        return '<unknown-host>'
      }
    })()
    const msg = (err as Error).message ?? String(err)
    throw new Error(
      `Postgres connect failed for host ${host}: ${msg}. If you see EHOSTUNREACH to an IPv6 address, use the Supabase connection pooler (Dashboard -> Database -> Connection string -> Transaction/Session pooler) for SUPABASE_DB_URL.`
    )
  }
  try {
    // Non-destructive schema ensure:
    // - If the table doesn't exist: create it.
    // - If it exists (possibly with a different schema): add missing columns and a UNIQUE constraint on country_code.
    await client.query(`CREATE TABLE IF NOT EXISTS public.${TABLE} (country_code text PRIMARY KEY);`)
    await client.query(`ALTER TABLE public.${TABLE} ADD COLUMN IF NOT EXISTS country_code text;`)
    await client.query(`ALTER TABLE public.${TABLE} ADD COLUMN IF NOT EXISTS iso3 text;`)
    await client.query(`ALTER TABLE public.${TABLE} ADD COLUMN IF NOT EXISTS name_en text;`)
    await client.query(`ALTER TABLE public.${TABLE} ADD COLUMN IF NOT EXISTS name_fr text;`)
    await client.query(`ALTER TABLE public.${TABLE} ADD COLUMN IF NOT EXISTS image_url text;`)
    await client.query(`ALTER TABLE public.${TABLE} ADD COLUMN IF NOT EXISTS bbox jsonb;`)
    await client.query(`ALTER TABLE public.${TABLE} ADD COLUMN IF NOT EXISTS centroid jsonb;`)

    // Unique index is enough for PostgREST upsert onConflict=country_code without breaking any existing PK.
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS ${TABLE}_country_code_key ON public.${TABLE} (country_code);`)

    // Supabase uses PostgREST which caches the schema; after DDL, request a schema reload.
    // This avoids "Could not find the 'bbox' column ... in the schema cache" right after ALTER TABLE.
    await client.query(`SELECT pg_notify('pgrst', 'reload schema');`)
  } finally {
    await client.end()
  }
}

type MetaFile = {
  generated_at: string
  metas: Record<string, RenderMeta>
}

type ColumnInfo = {
  column_name: string
  is_nullable: 'YES' | 'NO'
}

async function fetchCountriesColumns(connectionString: string): Promise<Map<string, ColumnInfo>> {
  setDefaultResultOrder('ipv4first')
  const u = new URL(connectionString)
  const isSupabaseHost = u.hostname.endsWith('.supabase.co') || u.hostname.endsWith('.supabase.com')
  const hasSslParam = u.searchParams.has('sslmode') || u.searchParams.has('ssl')
  const ssl =
    isSupabaseHost && !hasSslParam
      ? ({ rejectUnauthorized: false } as const)
      : undefined

  const client = new Client({ connectionString, ssl, family: 4 } as unknown as Record<string, unknown>)
  await client.connect()
  try {
    const res = await client.query<ColumnInfo>(
      `select column_name, is_nullable from information_schema.columns where table_schema='public' and table_name=$1`,
      [TABLE]
    )
    return new Map(res.rows.map((r) => [r.column_name, r]))
  } finally {
    await client.end()
  }
}

async function countriesTableReady(supabase: SupabaseClient): Promise<boolean> {
  // Prefer current schema (country_code), but tolerate legacy schema (iso2).
  for (const probe of ['country_code,bbox', 'iso2,bbox']) {
    const { error } = await supabase.from(TABLE).select(probe).limit(1)
    if (!error) return true
    const msg = error.message.toLowerCase()
    // Common PostgREST messages when table/column isn't in schema cache.
    const missing =
      msg.includes('schema cache') ||
      msg.includes('could not find') ||
      msg.includes('not found') ||
      (msg.includes('column') && msg.includes('does not exist'))
    if (missing) continue
    throw new Error(`Table existence check failed: ${error.message}`)
  }
  return false
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms))
}

async function waitForSchemaCache(supabase: SupabaseClient, tries = 12): Promise<void> {
  for (let i = 0; i < tries; i++) {
    for (const probe of ['country_code,bbox', 'iso2,bbox']) {
      const { error } = await supabase.from(TABLE).select(probe).limit(1)
      if (!error) return
      const msg = error.message.toLowerCase()
      const waiting =
        (msg.includes('schema cache') && (msg.includes('bbox') || msg.includes('country_code') || msg.includes('iso2'))) ||
        (msg.includes('could not find') && (msg.includes('bbox') || msg.includes('country_code') || msg.includes('iso2'))) ||
        (msg.includes('column') && msg.includes('does not exist'))
      if (waiting) {
        await sleep(500)
        continue
      }
      throw new Error(`Schema cache did not refresh: ${error.message}`)
    }
  }
  throw new Error(`Schema cache did not refresh after DDL (still missing expected columns). Try again in a few seconds.`)
}

export async function seedCountries(): Promise<{ upserted: number }> {
  const supabaseUrl = requireEnv('SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const connectionString = requireEnv('SUPABASE_DB_URL')

  assertServiceRoleKeyMatchesUrl(supabaseUrl, serviceKey)

  const meta = JSON.parse(await readFile(join(OUT_DIR, 'countries.meta.json'), 'utf8')) as MetaFile
  const iso2List = Object.keys(meta.metas).sort()
  const version = meta.generated_at

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  if (!(await countriesTableReady(supabase))) {
    await ensureCountriesTable()
    await waitForSchemaCache(supabase)
  }

  // Always introspect columns: the project may already have a `countries` table with a different PK.
  const columns = await fetchCountriesColumns(connectionString)
  const conflictKey = columns.has('country_code') ? 'country_code' : 'iso2'
  const needsUpdatedAt = columns.get('updated_at')?.is_nullable === 'NO'
  const nowIso = new Date().toISOString()

  const rows = iso2List.map((iso2) => {
    const m = meta.metas[iso2]
    const bbox = {
      lonLat_raw: m.bbox.lonLat_raw,
      lonLat_unwrapped: m.bbox.lonLat_unwrapped,
      lon_ref: m.bbox.lon_ref,
      lonLat_padded_unwrapped: m.bbox.lonLat_padded_unwrapped,
      padding_pct: m.bbox.padding_pct,
      min_extent_deg: m.bbox.min_extent_deg,
      projected: {
        viewBox: m.projected.viewBox,
        target_bounds: m.projected.target_bounds
      }
    }

    const row: Record<string, unknown> = {}

    if (columns.has('country_code')) row.country_code = iso2.toLowerCase()
    if (columns.has('iso2')) row.iso2 = iso2
    if (columns.has('iso3')) row.iso3 = m.iso3
    if (columns.has('name_en')) row.name_en = m.name_en
    if (columns.has('name_fr')) row.name_fr = m.name_fr ?? m.name_en
    if (columns.has('image_url')) row.image_url = publicUrlFor(supabaseUrl, iso2, version)
    if (columns.has('bbox')) row.bbox = bbox
    if (columns.has('centroid')) row.centroid = m.centroid
    if (needsUpdatedAt && columns.has('updated_at')) row.updated_at = nowIso

    // Ensure conflict key is present even if schema is unexpected.
    if (row[conflictKey] === undefined) {
      row[conflictKey] = conflictKey === 'country_code' ? iso2.toLowerCase() : iso2
    }

    return row
  })

  // PostgREST payload limits: chunk the upsert.
  const chunkSize = 500
  let upserted = 0

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const { error } = await supabase.from(TABLE).upsert(chunk, { onConflict: conflictKey })
    if (error) {
      throw new Error(`Upsert failed (chunk ${i}-${i + chunk.length}): ${error.message}`)
    }
    upserted += chunk.length
  }

  return { upserted }
}

if (isMainModule(import.meta.url)) {
  const res = await seedCountries()
  console.log(`Upserted: ${res.upserted}`)
}
