import './env.js'
import { createClient } from '@supabase/supabase-js'
import { v5 as uuidv5 } from 'uuid'
import { isMainModule } from './isMain.js'
import { assertServiceRoleKeyMatchesUrl } from './supabaseAuth.js'

const NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'

function requireEnv(name: string): string {
  const v = process.env[name]
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s) throw new Error(`Missing ${name} in environment`)
  return s
}

function packId(slug: string): string {
  return uuidv5(`pack:${slug}`, NAMESPACE)
}

function cardId(slug: string, iso2: string): string {
  return uuidv5(`card:${slug}:${iso2.toUpperCase()}`, NAMESPACE)
}

type CountryRow = {
  country_code?: string | null
  iso2?: string | null
  iso3?: string | null
  name_en?: string | null
  name_fr?: string | null
  image_url?: string | null
  centroid?: { lon?: number; lat?: number } | null
}

function mapUrlBlue(supabaseUrl: string, iso2: string): string {
  const base = supabaseUrl.replace(/\/$/, '')
  return `${base}/storage/v1/object/public/country-maps/svg-blue/${iso2.toUpperCase()}.svg`
}

async function listAvailableIso2FromStorage(supabase: any): Promise<Set<string>> {
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

async function deleteCardsNotInSet(supabase: any, packSlug: string, keepIds: Set<string>) {
  const pageSize = 1000
  let offset = 0
  const toDelete: string[] = []

  // eslint-disable-next-line no-constant-condition
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

  const packSlug = 'countries-locations'
  const now = new Date().toISOString()

  const { error: packErr } = await supabase.from('packs').upsert(
    [
      {
        id: packId(packSlug),
        slug: packSlug,
        title: 'Pays: localisations (SVG)',
        description: 'Cartes generees automatiquement depuis la table countries (SVG + centroid).',
        tags: ['Géographie/Location'],
        created_at: now,
        updated_at: now
      }
    ],
    { onConflict: 'slug' }
  )

  if (packErr) throw new Error(`packs upsert failed (${packSlug}): ${packErr.message}`)

  // Pull countries. Table uses PK country_code (iso2 lowercase) in this project.
  const { data: countries, error: cErr } = await supabase
    .from('countries')
    .select('iso2,iso3,name_en,name_fr,image_url,centroid,country_code')
    .order('country_code', { ascending: true })

  if (cErr) throw new Error(`countries select failed: ${cErr.message}`)

  const availableIso2 = await listAvailableIso2FromStorage(supabase)

  const rows = (countries ?? []) as CountryRow[]
  const keepIds = new Set<string>()

  const cards = rows
    .map((r) => {
      const iso2 = (r.iso2 ?? r.country_code ?? '').toString().trim().toUpperCase()
      const name = (r.name_fr ?? r.name_en ?? iso2).toString().trim()
      const image = mapUrlBlue(supabaseUrl, iso2)
      const lon = typeof r.centroid?.lon === 'number' ? r.centroid.lon : null
      const lat = typeof r.centroid?.lat === 'number' ? r.centroid.lat : null

      if (!iso2 || iso2.length !== 2) return null
      if (!availableIso2.has(iso2)) return null

      const id = cardId(packSlug, iso2)
      keepIds.add(id)

      const coords =
        typeof lat === 'number' && typeof lon === 'number'
          ? `\n\nCentroid (lat, lon): ${lat.toFixed(2)}, ${lon.toFixed(2)}`
          : ''

      return {
        id,
        pack_slug: packSlug,
        // Front: show the map (question). Back: reveal the country name.
        front_md: `![${iso2}](${image})\n\nQuel est ce pays ?`,
        back_md: `**${name}**${coords}`,
        tags: ['Géographie/Location'],
        created_at: now,
        updated_at: now
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const chunkSize = 500
  let upserted = 0
  for (let i = 0; i < cards.length; i += chunkSize) {
    const chunk = cards.slice(i, i + chunkSize)
    const { error } = await supabase.from('public_cards').upsert(chunk, { onConflict: 'id' })
    if (error) throw new Error(`public_cards upsert failed (${packSlug} chunk ${i}): ${error.message}`)
    upserted += chunk.length
  }

  const deleted = await deleteCardsNotInSet(supabase, packSlug, keepIds)

  return { pack_slug: packSlug, cards_upserted: upserted, cards_deleted: deleted }
}

if (isMainModule(import.meta.url)) {
  const res = await seedCountriesLocationPack()
  console.log(`pack_slug=${res.pack_slug} cards_upserted=${res.cards_upserted} cards_deleted=${res.cards_deleted}`)
}
