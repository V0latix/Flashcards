import './env.js'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { v5 as uuidv5 } from 'uuid'
import { isMainModule } from './isMain.js'
import { assertServiceRoleKeyMatchesUrl } from './supabaseAuth.js'
import { assertDestructiveOperationAllowed } from './destructive.js'

const NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'
const OUT_DIR = 'out'

function requireEnv(name: string): string {
  const v = process.env[name]
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s) throw new Error(`Missing ${name} in environment`)
  return s
}

async function readCountriesMetaVersion(): Promise<string | null> {
  try {
    const raw = await readFile(join(OUT_DIR, 'countries.meta.json'), 'utf8')
    const parsed = JSON.parse(raw) as { generated_at?: string }
    return typeof parsed.generated_at === 'string' && parsed.generated_at.trim() ? parsed.generated_at.trim() : null
  } catch {
    return null
  }
}

function packId(slug: string): string {
  return uuidv5(`pack:${slug}`, NAMESPACE)
}

function cardId(slug: string, iso2: string): string {
  return uuidv5(`card:${slug}:${iso2.toUpperCase()}`, NAMESPACE)
}

type CountryRow = {
  country_code?: string | null
  iso3?: string | null
  name_en?: string | null
  name_fr?: string | null
  image_url?: string | null
  centroid?: { lon?: number; lat?: number } | null
}

type PackConfig = {
  slug: string
  title: string
  description: string
  tags: string[]
}

type SeedPackResult = {
  pack_slug: string
  cards_upserted: number
  cards_deleted: number
}

const PACK_COUNTRIES: PackConfig = {
  slug: 'countries-locations',
  title: 'Pays: localisations (SVG)',
  description: 'Cartes de localisation pour les pays (hors iles non-souveraines).',
  tags: ['Géographie/Location']
}

const PACK_ISLANDS_NON_COUNTRIES: PackConfig = {
  slug: 'islands-locations',
  title: 'Îles (non-pays): localisations (SVG)',
  description: 'Cartes de localisation pour les iles qui ne sont pas des pays souverains.',
  tags: ['Géographie/Location', 'Géographie/Location/Iles']
}

// Natural Earth dependencies/disputed island territories that should be separated from sovereign countries.
const ISLAND_NON_COUNTRY_ISO2 = new Set([
  'AI',
  'AS',
  'BL',
  'BM',
  'CK',
  'FK',
  'FO',
  'GS',
  'GU',
  'HM',
  'IO',
  'KY',
  'MF',
  'MP',
  'MS',
  'NC',
  'NF',
  'NU',
  'PF',
  'PM',
  'PN',
  'PR',
  'SH',
  'TC',
  'TF',
  'VG',
  'VI',
  'WF'
])

// Explicitly excluded from both packs.
const EXCLUDED_ISO2 = new Set(['AQ', 'EH'])

function mapUrlBlue(supabaseUrl: string, iso2: string, version?: string | null): string {
  const base = supabaseUrl.replace(/\/$/, '')
  const url = `${base}/storage/v1/object/public/country-maps/svg-blue/${iso2.toUpperCase()}.svg`
  return version ? `${url}?v=${encodeURIComponent(version)}` : url
}

async function listAvailableIso2FromStorage(supabase: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await supabase.storage.from('country-maps').list('svg-blue', {
    limit: 1000,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' }
  })
  if (error) throw new Error(`storage list svg-blue failed: ${error.message}`)

  const set = new Set<string>()
  for (const obj of data ?? []) {
    const name = (obj as { name?: string }).name ?? ''
    const m = name.match(/^([A-Z]{2})\.svg$/i)
    if (m) set.add(m[1].toUpperCase())
  }
  return set
}

async function deleteCardsNotInSet(supabase: SupabaseClient, packSlug: string, keepIds: Set<string>) {
  const pageSize = 1000
  let offset = 0
  const toDelete: string[] = []

  while (true) {
    const { data, error } = await supabase
      .from('public_cards')
      .select('id')
      .eq('pack_slug', packSlug)
      .range(offset, offset + pageSize - 1)
    if (error) throw new Error(`list public_cards failed: ${error.message}`)
    const ids = (data ?? []).map((r: { id: string }) => r.id)
    if (ids.length === 0) break

    for (const id of ids) {
      if (!keepIds.has(id)) toDelete.push(id)
    }

    if (ids.length < pageSize) break
    offset += pageSize
  }

  if (toDelete.length === 0) return 0

  assertDestructiveOperationAllowed('delete stale pack cards')

  const chunkSize = 200
  let deleted = 0
  for (let i = 0; i < toDelete.length; i += chunkSize) {
    const chunk = toDelete.slice(i, i + chunkSize)
    const { error } = await supabase.from('public_cards').delete().in('id', chunk)
    if (error) throw new Error(`delete public_cards failed: ${error.message}`)
    deleted += chunk.length
  }

  return deleted
}

export async function seedCountriesLocationPack(): Promise<{
  packs: SeedPackResult[]
}> {
  const supabaseUrl = requireEnv('SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  assertServiceRoleKeyMatchesUrl(supabaseUrl, serviceKey)

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const now = new Date().toISOString()
  const version = await readCountriesMetaVersion()
  const packs: PackConfig[] = [PACK_COUNTRIES, PACK_ISLANDS_NON_COUNTRIES]
  for (const pack of packs) {
    const { error: packErr } = await supabase.from('packs').upsert(
      [
        {
          id: packId(pack.slug),
          slug: pack.slug,
          title: pack.title,
          description: pack.description,
          tags: pack.tags,
          created_at: now,
          updated_at: now
        }
      ],
      { onConflict: 'slug' }
    )
    if (packErr) throw new Error(`packs upsert failed (${pack.slug}): ${packErr.message}`)
  }

  // Pull countries. Table uses PK country_code (iso2 lowercase) in this project.
  const { data: countries, error: cErr } = await supabase
    .from('countries')
    .select('iso3,name_en,name_fr,image_url,centroid,country_code')
    .order('country_code', { ascending: true })

  if (cErr) throw new Error(`countries select failed: ${cErr.message}`)

  const availableIso2 = await listAvailableIso2FromStorage(supabase)

  const rows = (countries ?? []) as CountryRow[]
  const keepIdsByPack = new Map<string, Set<string>>([
    [PACK_COUNTRIES.slug, new Set<string>()],
    [PACK_ISLANDS_NON_COUNTRIES.slug, new Set<string>()]
  ])
  const cardsByPack = new Map<string, Array<Record<string, unknown>>>([
    [PACK_COUNTRIES.slug, []],
    [PACK_ISLANDS_NON_COUNTRIES.slug, []]
  ])

  for (const r of rows) {
      const iso2 = (r.country_code ?? '').toString().trim().toUpperCase()
      const name = (r.name_fr ?? r.name_en ?? iso2).toString().trim()
      const image = mapUrlBlue(supabaseUrl, iso2, version)

      if (!iso2 || iso2.length !== 2) continue
      if (!availableIso2.has(iso2)) continue
      if (EXCLUDED_ISO2.has(iso2)) continue

      const pack = ISLAND_NON_COUNTRY_ISO2.has(iso2) ? PACK_ISLANDS_NON_COUNTRIES : PACK_COUNTRIES
      const id = cardId(pack.slug, iso2)
      keepIdsByPack.get(pack.slug)?.add(id)

      const question = pack.slug === PACK_ISLANDS_NON_COUNTRIES.slug ? 'Quelle est cette île ?' : 'Quel est ce pays ?'

      cardsByPack.get(pack.slug)?.push({
        id,
        pack_slug: pack.slug,
        // Front: show the map (question). Back: reveal the name.
        front_md: `![${iso2}](${image})\n\n${question}`,
        back_md: `**${name}**`,
        tags: pack.tags,
        created_at: now,
        updated_at: now
      })
  }

  const chunkSize = 500
  const results: SeedPackResult[] = []
  for (const pack of packs) {
    const cards = cardsByPack.get(pack.slug) ?? []
    let upserted = 0
    for (let i = 0; i < cards.length; i += chunkSize) {
      const chunk = cards.slice(i, i + chunkSize)
      const { error } = await supabase.from('public_cards').upsert(chunk, { onConflict: 'id' })
      if (error) throw new Error(`public_cards upsert failed (${pack.slug} chunk ${i}): ${error.message}`)
      upserted += chunk.length
    }

    const keepIds = keepIdsByPack.get(pack.slug) ?? new Set<string>()
    const deleted = await deleteCardsNotInSet(supabase, pack.slug, keepIds)
    results.push({ pack_slug: pack.slug, cards_upserted: upserted, cards_deleted: deleted })
  }

  return { packs: results }
}

if (isMainModule(import.meta.url)) {
  const res = await seedCountriesLocationPack()
  for (const pack of res.packs) {
    console.log(`pack_slug=${pack.pack_slug} cards_upserted=${pack.cards_upserted} cards_deleted=${pack.cards_deleted}`)
  }
}
