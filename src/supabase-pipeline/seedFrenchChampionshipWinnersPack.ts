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
  winner_fr: string
}

// Champion de France de football (annee de fin de saison).
// 1993: aucun champion (titre retire a Marseille).
const EDITIONS: Edition[] = [
  { year: 1933, winner_fr: 'Olympique Lillois' },
  { year: 1934, winner_fr: 'Sète' },
  { year: 1935, winner_fr: 'Sochaux' },
  { year: 1936, winner_fr: 'Racing Club de Paris' },
  { year: 1937, winner_fr: 'Marseille' },
  { year: 1938, winner_fr: 'Sochaux' },
  { year: 1939, winner_fr: 'Sète' },
  { year: 1946, winner_fr: 'Lille' },
  { year: 1947, winner_fr: 'Roubaix-Tourcoing' },
  { year: 1948, winner_fr: 'Marseille' },
  { year: 1949, winner_fr: 'Reims' },
  { year: 1950, winner_fr: 'Bordeaux' },
  { year: 1951, winner_fr: 'Nice' },
  { year: 1952, winner_fr: 'Nice' },
  { year: 1953, winner_fr: 'Reims' },
  { year: 1954, winner_fr: 'Lille' },
  { year: 1955, winner_fr: 'Reims' },
  { year: 1956, winner_fr: 'Nice' },
  { year: 1957, winner_fr: 'Saint-Étienne' },
  { year: 1958, winner_fr: 'Reims' },
  { year: 1959, winner_fr: 'Nice' },
  { year: 1960, winner_fr: 'Reims' },
  { year: 1961, winner_fr: 'Monaco' },
  { year: 1962, winner_fr: 'Reims' },
  { year: 1963, winner_fr: 'Monaco' },
  { year: 1964, winner_fr: 'Saint-Étienne' },
  { year: 1965, winner_fr: 'Nantes' },
  { year: 1966, winner_fr: 'Nantes' },
  { year: 1967, winner_fr: 'Saint-Étienne' },
  { year: 1968, winner_fr: 'Saint-Étienne' },
  { year: 1969, winner_fr: 'Saint-Étienne' },
  { year: 1970, winner_fr: 'Saint-Étienne' },
  { year: 1971, winner_fr: 'Marseille' },
  { year: 1972, winner_fr: 'Marseille' },
  { year: 1973, winner_fr: 'Nantes' },
  { year: 1974, winner_fr: 'Saint-Étienne' },
  { year: 1975, winner_fr: 'Saint-Étienne' },
  { year: 1976, winner_fr: 'Saint-Étienne' },
  { year: 1977, winner_fr: 'Nantes' },
  { year: 1978, winner_fr: 'Monaco' },
  { year: 1979, winner_fr: 'Strasbourg' },
  { year: 1980, winner_fr: 'Nantes' },
  { year: 1981, winner_fr: 'Saint-Étienne' },
  { year: 1982, winner_fr: 'Monaco' },
  { year: 1983, winner_fr: 'Nantes' },
  { year: 1984, winner_fr: 'Bordeaux' },
  { year: 1985, winner_fr: 'Bordeaux' },
  { year: 1986, winner_fr: 'Paris Saint-Germain' },
  { year: 1987, winner_fr: 'Bordeaux' },
  { year: 1988, winner_fr: 'Monaco' },
  { year: 1989, winner_fr: 'Marseille' },
  { year: 1990, winner_fr: 'Marseille' },
  { year: 1991, winner_fr: 'Marseille' },
  { year: 1992, winner_fr: 'Marseille' },
  { year: 1993, winner_fr: 'Aucun (titre retiré)' },
  { year: 1994, winner_fr: 'Paris Saint-Germain' },
  { year: 1995, winner_fr: 'Nantes' },
  { year: 1996, winner_fr: 'Auxerre' },
  { year: 1997, winner_fr: 'Monaco' },
  { year: 1998, winner_fr: 'Lens' },
  { year: 1999, winner_fr: 'Bordeaux' },
  { year: 2000, winner_fr: 'Monaco' },
  { year: 2001, winner_fr: 'Nantes' },
  { year: 2002, winner_fr: 'Lyon' },
  { year: 2003, winner_fr: 'Lyon' },
  { year: 2004, winner_fr: 'Lyon' },
  { year: 2005, winner_fr: 'Lyon' },
  { year: 2006, winner_fr: 'Lyon' },
  { year: 2007, winner_fr: 'Lyon' },
  { year: 2008, winner_fr: 'Lyon' },
  { year: 2009, winner_fr: 'Bordeaux' },
  { year: 2010, winner_fr: 'Marseille' },
  { year: 2011, winner_fr: 'Lille' },
  { year: 2012, winner_fr: 'Montpellier' },
  { year: 2013, winner_fr: 'Paris Saint-Germain' },
  { year: 2014, winner_fr: 'Paris Saint-Germain' },
  { year: 2015, winner_fr: 'Paris Saint-Germain' },
  { year: 2016, winner_fr: 'Paris Saint-Germain' },
  { year: 2017, winner_fr: 'Monaco' },
  { year: 2018, winner_fr: 'Paris Saint-Germain' },
  { year: 2019, winner_fr: 'Paris Saint-Germain' },
  { year: 2020, winner_fr: 'Paris Saint-Germain' },
  { year: 2021, winner_fr: 'Lille' },
  { year: 2022, winner_fr: 'Paris Saint-Germain' },
  { year: 2023, winner_fr: 'Paris Saint-Germain' },
  { year: 2024, winner_fr: 'Paris Saint-Germain' },
  { year: 2025, winner_fr: 'Paris Saint-Germain' }
]

export async function seedFrenchChampionshipWinnersPack(): Promise<{
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

  const packSlug = 'vainqueur-championnat-france-football'
  const now = new Date().toISOString()
  const tags = ['Sport/Football']

  const { error: packErr } = await supabase.from('packs').upsert(
    [
      {
        id: packId(packSlug),
        slug: packSlug,
        title: 'Vainqueur Championnat de France de football',
        description: 'Vainqueur par annee (annee de fin de saison).',
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
      front_md: `Vainqueur championnat de france de football en ${e.year}`,
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
  const res = await seedFrenchChampionshipWinnersPack()
  console.log(`pack_slug=${res.pack_slug} cards_upserted=${res.cards_upserted} cards_deleted=${res.cards_deleted}`)
}

