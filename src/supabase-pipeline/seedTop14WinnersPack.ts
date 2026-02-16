import './env.js'
import { createClient } from '@supabase/supabase-js'
import { v5 as uuidv5 } from 'uuid'
import { isMainModule } from './isMain.js'
import { assertServiceRoleKeyMatchesUrl } from './supabaseAuth.js'
import { assertDestructiveOperationAllowed } from './destructive.js'

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
  winner_fr: string
}

// Championnat de France de rugby (annee de fin de saison), depuis 1995.
const EDITIONS: Edition[] = [
  { year: 1995, winner_fr: 'Stade Toulousain' },
  { year: 1996, winner_fr: 'Stade Toulousain' },
  { year: 1997, winner_fr: 'Stade Toulousain' },
  { year: 1998, winner_fr: 'Stade Français Paris' },
  { year: 1999, winner_fr: 'Stade Toulousain' },
  { year: 2000, winner_fr: 'Stade Français' },
  { year: 2001, winner_fr: 'Stade Toulousain' },
  { year: 2002, winner_fr: 'Biarritz Olympique' },
  { year: 2003, winner_fr: 'Stade Français' },
  { year: 2004, winner_fr: 'Stade Français' },
  { year: 2005, winner_fr: 'Biarritz Olympique' },
  { year: 2006, winner_fr: 'Biarritz Olympique' },
  { year: 2007, winner_fr: 'Stade Français' },
  { year: 2008, winner_fr: 'Stade Toulousain' },
  { year: 2009, winner_fr: 'USA Perpignan' },
  { year: 2010, winner_fr: 'ASM Clermont Auvergne' },
  { year: 2011, winner_fr: 'Stade Toulousain' },
  { year: 2012, winner_fr: 'Stade Toulousain' },
  { year: 2013, winner_fr: 'Castres Olympique' },
  { year: 2014, winner_fr: 'RC Toulon' },
  { year: 2015, winner_fr: 'Stade Français' },
  { year: 2016, winner_fr: 'Racing 92' },
  { year: 2017, winner_fr: 'ASM Clermont Auvergne' },
  { year: 2018, winner_fr: 'Castres Olympique' },
  { year: 2019, winner_fr: 'Stade Toulousain' },
  { year: 2020, winner_fr: 'Aucun (saison arrêtée)' },
  { year: 2021, winner_fr: 'Stade Toulousain' },
  { year: 2022, winner_fr: 'Montpellier Hérault Rugby' },
  { year: 2023, winner_fr: 'Stade Toulousain' },
  { year: 2024, winner_fr: 'Stade Toulousain' },
  { year: 2025, winner_fr: 'Stade Toulousain' }
]

export async function seedTop14WinnersPack(): Promise<{
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

  const packSlug = 'top14-champions'
  const now = new Date().toISOString()
  const tags = ['Sport/Rugby']

  const { error: packErr } = await supabase.from('packs').upsert(
    [
      {
        id: packId(packSlug),
        slug: packSlug,
        title: 'Vainqueur Championnat de France de rugby',
        description: 'Championnat de France de rugby: vainqueur par année depuis 1995 (année de fin de saison).',
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
      front_md: `Vainqueur championnat de france de rugby en ${e.year}`,
      back_md: e.winner_fr,
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

  const pageSize = 1000
  let offset = 0
  const toDelete: string[] = []
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
    assertDestructiveOperationAllowed('delete stale pack cards')

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
  const res = await seedTop14WinnersPack()
  console.log(`pack_slug=${res.pack_slug} cards_upserted=${res.cards_upserted} cards_deleted=${res.cards_deleted}`)
}
