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

function cardId(slug: string, year: number): string {
  return uuidv5(`card:${slug}:${year}`, NAMESPACE)
}

type Edition = {
  year: number
  host_fr: string
  winner_fr: string
}

// FIFA World Cup (men) editions held (exclude canceled 1942/1946).
// Keep it to completed tournaments only to avoid "unknown winner" cards.
const EDITIONS: Edition[] = [
  { year: 1930, host_fr: 'Uruguay', winner_fr: 'Uruguay' },
  { year: 1934, host_fr: 'Italie', winner_fr: 'Italie' },
  { year: 1938, host_fr: 'France', winner_fr: 'Italie' },
  { year: 1950, host_fr: 'Brésil', winner_fr: 'Uruguay' },
  { year: 1954, host_fr: 'Suisse', winner_fr: 'Allemagne' },
  { year: 1958, host_fr: 'Suède', winner_fr: 'Brésil' },
  { year: 1962, host_fr: 'Chili', winner_fr: 'Brésil' },
  { year: 1966, host_fr: 'Angleterre', winner_fr: 'Angleterre' },
  { year: 1970, host_fr: 'Mexique', winner_fr: 'Brésil' },
  { year: 1974, host_fr: 'Allemagne', winner_fr: 'Allemagne' },
  { year: 1978, host_fr: 'Argentine', winner_fr: 'Argentine' },
  { year: 1982, host_fr: 'Espagne', winner_fr: 'Italie' },
  { year: 1986, host_fr: 'Mexique', winner_fr: 'Argentine' },
  { year: 1990, host_fr: 'Italie', winner_fr: 'Allemagne' },
  { year: 1994, host_fr: 'États-Unis', winner_fr: 'Brésil' },
  { year: 1998, host_fr: 'France', winner_fr: 'France' },
  { year: 2002, host_fr: 'Corée du Sud/Japon', winner_fr: 'Brésil' },
  { year: 2006, host_fr: 'Allemagne', winner_fr: 'Italie' },
  { year: 2010, host_fr: 'Afrique du Sud', winner_fr: 'Espagne' },
  { year: 2014, host_fr: 'Brésil', winner_fr: 'Allemagne' },
  { year: 2018, host_fr: 'Russie', winner_fr: 'France' },
  { year: 2022, host_fr: 'Qatar', winner_fr: 'Argentine' }
]

export async function seedWorldCupFootballPack(): Promise<{
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

  const packSlug = 'coupe-du-monde-football'
  const now = new Date().toISOString()
  const tags = ['Sport/Football']

  const { error: packErr } = await supabase.from('packs').upsert(
    [
      {
        id: packId(packSlug),
        slug: packSlug,
        title: 'Coupe du monde de football: hôtes et vainqueurs',
        description: "Coupe du monde (hommes): pays hôte et vainqueur par édition (toutes les éditions jouées).",
        tags,
        created_at: now,
        updated_at: now
      }
    ],
    { onConflict: 'slug' }
  )
  if (packErr) throw new Error(`packs upsert failed (${packSlug}): ${packErr.message}`)

  const editions = [...EDITIONS].sort((a, b) => a.year - b.year)
  const keepIds = new Set<string>()
  const cards = editions.map((e) => {
    const id = cardId(packSlug, e.year)
    keepIds.add(id)
    return {
      id,
      pack_slug: packSlug,
      front_md: `Hote et vainqueur coupe du monde ${e.year}`,
      back_md: `${e.host_fr}, ${e.winner_fr}`,
      tags,
      created_at: now,
      updated_at: now
    }
  })

  const chunkSize = 500
  let upserted = 0
  for (let i = 0; i < cards.length; i += chunkSize) {
    const chunk = cards.slice(i, i + chunkSize)
    const { error } = await supabase.from('public_cards').upsert(chunk, { onConflict: 'id' })
    if (error) throw new Error(`public_cards upsert failed (${packSlug} chunk ${i}): ${error.message}`)
    upserted += chunk.length
  }

  // Delete cards in this pack that are no longer in the dataset.
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
    if (error) throw new Error(`list public_cards failed (${packSlug}): ${error.message}`)
    const ids = (data ?? []).map((r: { id: string }) => r.id)
    if (ids.length === 0) break
    for (const id of ids) if (!keepIds.has(id)) toDelete.push(id)
    if (ids.length < pageSize) break
    offset += pageSize
  }

  let deleted = 0
  if (toDelete.length > 0) {
    const delChunkSize = 200
    for (let i = 0; i < toDelete.length; i += delChunkSize) {
      const chunk = toDelete.slice(i, i + delChunkSize)
      const { error } = await supabase.from('public_cards').delete().in('id', chunk)
      if (error) throw new Error(`delete public_cards failed (${packSlug}): ${error.message}`)
      deleted += chunk.length
    }
  }

  return { pack_slug: packSlug, cards_upserted: upserted, cards_deleted: deleted }
}

if (isMainModule(import.meta.url)) {
  const res = await seedWorldCupFootballPack()
  console.log(`pack_slug=${res.pack_slug} cards_upserted=${res.cards_upserted} cards_deleted=${res.cards_deleted}`)
}

