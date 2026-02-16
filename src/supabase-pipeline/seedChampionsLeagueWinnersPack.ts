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
  winner: string
}

const EDITIONS: Edition[] = [
  { year: 1993, winner: 'Marseille' },
  { year: 1994, winner: 'Milan' },
  { year: 1995, winner: 'Ajax' },
  { year: 1996, winner: 'Juventus' },
  { year: 1997, winner: 'Borussia Dortmund' },
  { year: 1998, winner: 'Real Madrid' },
  { year: 1999, winner: 'Manchester United' },
  { year: 2000, winner: 'Real Madrid' },
  { year: 2001, winner: 'Bayern Munich' },
  { year: 2002, winner: 'Real Madrid' },
  { year: 2003, winner: 'Milan' },
  { year: 2004, winner: 'Porto' },
  { year: 2005, winner: 'Liverpool' },
  { year: 2006, winner: 'Barcelona' },
  { year: 2007, winner: 'Milan' },
  { year: 2008, winner: 'Manchester United' },
  { year: 2009, winner: 'Barcelona' },
  { year: 2010, winner: 'Inter' },
  { year: 2011, winner: 'Barcelona' },
  { year: 2012, winner: 'Chelsea' },
  { year: 2013, winner: 'Bayern Munich' },
  { year: 2014, winner: 'Real Madrid' },
  { year: 2015, winner: 'Barcelona' },
  { year: 2016, winner: 'Real Madrid' },
  { year: 2017, winner: 'Real Madrid' },
  { year: 2018, winner: 'Real Madrid' },
  { year: 2019, winner: 'Liverpool' },
  { year: 2020, winner: 'Bayern Munich' },
  { year: 2021, winner: 'Chelsea' },
  { year: 2022, winner: 'Real Madrid' },
  { year: 2023, winner: 'Manchester City' },
  { year: 2024, winner: 'Real Madrid' }
]

export async function seedChampionsLeagueWinnersPack(): Promise<{
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

  const packSlug = 'vainqueurs-ligue-des-champions'
  const now = new Date().toISOString()
  const tags = ['Sport/Football']

  const { error: packErr } = await supabase.from('packs').upsert(
    [
      {
        id: packId(packSlug),
        slug: packSlug,
        title: 'Ligue des champions: vainqueurs',
        description: 'Vainqueur de la Ligue des champions UEFA par annee.',
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
  const cards = editions.map((entry) => {
    const id = cardId(packSlug, entry.year)
    keepIds.add(id)
    return {
      id,
      pack_slug: packSlug,
      front_md: `Vainqueur Ligue des champions en ${entry.year}`,
      back_md: entry.winner,
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
  const res = await seedChampionsLeagueWinnersPack()
  console.log(`pack_slug=${res.pack_slug} cards_upserted=${res.cards_upserted} cards_deleted=${res.cards_deleted}`)
}

