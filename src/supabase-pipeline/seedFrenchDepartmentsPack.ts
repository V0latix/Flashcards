import './env.js'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { v5 as uuidv5 } from 'uuid'
import { isMainModule } from './isMain.js'
import { assertServiceRoleKeyMatchesUrl } from './supabaseAuth.js'
import { assertDestructiveOperationAllowed } from './destructive.js'

const NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'
const OUT_DEPARTEMENTS_DIR = join(process.cwd(), 'out', 'departements')
const BUCKET = 'france-departements-maps'
const STORAGE_PREFIX = 'svg'

function requireEnv(name: string): string {
  const v = process.env[name]
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s) throw new Error(`Missing ${name} in environment`)
  return s
}

async function readMetaVersion(): Promise<string | null> {
  try {
    const raw = await readFile(join(OUT_DEPARTEMENTS_DIR, 'departements.meta.json'), 'utf8')
    const parsed = JSON.parse(raw) as { generated_at?: string }
    const value = parsed.generated_at?.trim()
    return value || null
  } catch {
    return null
  }
}

function packId(slug: string): string {
  return uuidv5(`pack:${slug}`, NAMESPACE)
}

function cardId(slug: string, code: string): string {
  return uuidv5(`card:${slug}:${code.toUpperCase()}`, NAMESPACE)
}

function imageUrl(supabaseUrl: string, code: string, version: string | null): string {
  const base = supabaseUrl.replace(/\/$/, '')
  const url = `${base}/storage/v1/object/public/${BUCKET}/${STORAGE_PREFIX}/${code.toUpperCase()}.svg`
  return version ? `${url}?v=${encodeURIComponent(version)}` : url
}

async function listAvailableCodes(supabase: SupabaseClient): Promise<Set<string>> {
  const res = await supabase.storage.from(BUCKET).list(STORAGE_PREFIX, {
    limit: 1000,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' }
  })
  if (res.error) throw new Error(`storage list failed: ${res.error.message}`)

  const out = new Set<string>()
  for (const entry of res.data ?? []) {
    const name = (entry as { name?: string }).name ?? ''
    const m = name.match(/^([0-9]{2,3}|2A|2B)\.svg$/i)
    if (m) out.add(m[1].toUpperCase())
  }
  return out
}

async function deleteCardsNotInSet(supabase: SupabaseClient, packSlug: string, keepIds: Set<string>) {
  const pageSize = 1000
  let offset = 0
  const toDelete: string[] = []

  while (true) {
    const res = await supabase
      .from('public_cards')
      .select('id')
      .eq('pack_slug', packSlug)
      .range(offset, offset + pageSize - 1)
    if (res.error) throw new Error(`list public_cards failed: ${res.error.message}`)

    const ids = (res.data ?? []).map((r: { id: string }) => r.id)
    if (ids.length === 0) break
    for (const id of ids) if (!keepIds.has(id)) toDelete.push(id)
    if (ids.length < pageSize) break
    offset += pageSize
  }

  if (toDelete.length === 0) return 0

  assertDestructiveOperationAllowed('delete stale departements pack cards')

  const chunkSize = 200
  let deleted = 0
  for (let i = 0; i < toDelete.length; i += chunkSize) {
    const chunk = toDelete.slice(i, i + chunkSize)
    const del = await supabase.from('public_cards').delete().in('id', chunk)
    if (del.error) throw new Error(`delete public_cards failed: ${del.error.message}`)
    deleted += chunk.length
  }
  return deleted
}

type DepartementRow = {
  numero: string
  nom: string
}

function isOfficialDepartementCode(code: string): boolean {
  return /^(0[1-9]|1[0-9]|2[1-9]|[3-8][0-9]|9[0-5]|2A|2B|97(1|2|3|4|6))$/.test(code)
}

export async function seedFrenchDepartmentsPack(): Promise<{
  pack_slug: string
  cards_upserted: number
  cards_deleted: number
}> {
  const supabaseUrl = requireEnv('SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  assertServiceRoleKeyMatchesUrl(supabaseUrl, serviceKey)

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const packSlug = 'departements-francais-localisation'
  const now = new Date().toISOString()
  const version = await readMetaVersion()

  const packRes = await supabase.from('packs').upsert(
    [
      {
        id: packId(packSlug),
        slug: packSlug,
        title: 'Départements français : localisation',
        description: 'Reconnaître le département français mis en surbrillance.',
        tags: ['Géographie/France/Départements'],
        created_at: now,
        updated_at: now
      }
    ],
    { onConflict: 'slug' }
  )
  if (packRes.error) throw new Error(`packs upsert failed (${packSlug}): ${packRes.error.message}`)

  const availableCodes = await listAvailableCodes(supabase)

  const depsRes = await supabase.from('departements').select('numero,nom').order('numero', { ascending: true })
  if (depsRes.error) throw new Error(`departements select failed: ${depsRes.error.message}`)
  const deps = (depsRes.data ?? []) as DepartementRow[]

  const keepIds = new Set<string>()
  const cards = deps
    .map((d) => {
      const code = (d.numero ?? '').trim().toUpperCase()
      const name = (d.nom ?? '').trim()
      if (!code || !name) return null
      if (!isOfficialDepartementCode(code)) return null
      if (!availableCodes.has(code)) return null

      const id = cardId(packSlug, code)
      keepIds.add(id)
      const image = imageUrl(supabaseUrl, code, version)

      return {
        id,
        pack_slug: packSlug,
        front_md: `![Département ${code}](${image})\n\nQuel est ce département ?`,
        back_md: `**${name}**`,
        tags: ['Géographie/France/Départements'],
        created_at: now,
        updated_at: now
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const chunkSize = 500
  let upserted = 0
  for (let i = 0; i < cards.length; i += chunkSize) {
    const chunk = cards.slice(i, i + chunkSize)
    const up = await supabase.from('public_cards').upsert(chunk, { onConflict: 'id' })
    if (up.error) throw new Error(`public_cards upsert failed (${packSlug} chunk ${i}): ${up.error.message}`)
    upserted += chunk.length
  }

  const deleted = await deleteCardsNotInSet(supabase, packSlug, keepIds)

  return { pack_slug: packSlug, cards_upserted: upserted, cards_deleted: deleted }
}

if (isMainModule(import.meta.url)) {
  const res = await seedFrenchDepartmentsPack()
  console.log(`pack_slug=${res.pack_slug} cards_upserted=${res.cards_upserted} cards_deleted=${res.cards_deleted}`)
}
