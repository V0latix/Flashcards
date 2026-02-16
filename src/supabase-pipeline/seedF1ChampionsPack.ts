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
  champion: string
}

const EDITIONS: Edition[] = [
  { year: 1950, champion: 'Giuseppe Farina' },
  { year: 1951, champion: 'Juan Manuel Fangio' },
  { year: 1952, champion: 'Alberto Ascari' },
  { year: 1953, champion: 'Alberto Ascari' },
  { year: 1954, champion: 'Juan Manuel Fangio' },
  { year: 1955, champion: 'Juan Manuel Fangio' },
  { year: 1956, champion: 'Juan Manuel Fangio' },
  { year: 1957, champion: 'Juan Manuel Fangio' },
  { year: 1958, champion: 'Mike Hawthorn' },
  { year: 1959, champion: 'Jack Brabham' },
  { year: 1960, champion: 'Jack Brabham' },
  { year: 1961, champion: 'Phil Hill' },
  { year: 1962, champion: 'Graham Hill' },
  { year: 1963, champion: 'Jim Clark' },
  { year: 1964, champion: 'John Surtees' },
  { year: 1965, champion: 'Jim Clark' },
  { year: 1966, champion: 'Jack Brabham' },
  { year: 1967, champion: 'Denny Hulme' },
  { year: 1968, champion: 'Graham Hill' },
  { year: 1969, champion: 'Jackie Stewart' },
  { year: 1970, champion: 'Jochen Rindt' },
  { year: 1971, champion: 'Jackie Stewart' },
  { year: 1972, champion: 'Emerson Fittipaldi' },
  { year: 1973, champion: 'Jackie Stewart' },
  { year: 1974, champion: 'Emerson Fittipaldi' },
  { year: 1975, champion: 'Niki Lauda' },
  { year: 1976, champion: 'James Hunt' },
  { year: 1977, champion: 'Niki Lauda' },
  { year: 1978, champion: 'Mario Andretti' },
  { year: 1979, champion: 'Jody Scheckter' },
  { year: 1980, champion: 'Alan Jones' },
  { year: 1981, champion: 'Nelson Piquet' },
  { year: 1982, champion: 'Keke Rosberg' },
  { year: 1983, champion: 'Nelson Piquet' },
  { year: 1984, champion: 'Niki Lauda' },
  { year: 1985, champion: 'Alain Prost' },
  { year: 1986, champion: 'Alain Prost' },
  { year: 1987, champion: 'Nelson Piquet' },
  { year: 1988, champion: 'Ayrton Senna' },
  { year: 1989, champion: 'Alain Prost' },
  { year: 1990, champion: 'Ayrton Senna' },
  { year: 1991, champion: 'Ayrton Senna' },
  { year: 1992, champion: 'Nigel Mansell' },
  { year: 1993, champion: 'Alain Prost' },
  { year: 1994, champion: 'Michael Schumacher' },
  { year: 1995, champion: 'Michael Schumacher' },
  { year: 1996, champion: 'Damon Hill' },
  { year: 1997, champion: 'Jacques Villeneuve' },
  { year: 1998, champion: 'Mika Hakkinen' },
  { year: 1999, champion: 'Mika Hakkinen' },
  { year: 2000, champion: 'Michael Schumacher' },
  { year: 2001, champion: 'Michael Schumacher' },
  { year: 2002, champion: 'Michael Schumacher' },
  { year: 2003, champion: 'Michael Schumacher' },
  { year: 2004, champion: 'Michael Schumacher' },
  { year: 2005, champion: 'Fernando Alonso' },
  { year: 2006, champion: 'Fernando Alonso' },
  { year: 2007, champion: 'Kimi Raikkonen' },
  { year: 2008, champion: 'Lewis Hamilton' },
  { year: 2009, champion: 'Jenson Button' },
  { year: 2010, champion: 'Sebastian Vettel' },
  { year: 2011, champion: 'Sebastian Vettel' },
  { year: 2012, champion: 'Sebastian Vettel' },
  { year: 2013, champion: 'Sebastian Vettel' },
  { year: 2014, champion: 'Lewis Hamilton' },
  { year: 2015, champion: 'Lewis Hamilton' },
  { year: 2016, champion: 'Nico Rosberg' },
  { year: 2017, champion: 'Lewis Hamilton' },
  { year: 2018, champion: 'Lewis Hamilton' },
  { year: 2019, champion: 'Lewis Hamilton' },
  { year: 2020, champion: 'Lewis Hamilton' },
  { year: 2021, champion: 'Max Verstappen' },
  { year: 2022, champion: 'Max Verstappen' },
  { year: 2023, champion: 'Max Verstappen' },
  { year: 2024, champion: 'Max Verstappen' }
]

export async function seedF1ChampionsPack(): Promise<{
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

  const packSlug = 'champions-f1'
  const now = new Date().toISOString()
  const tags = ['Sport/F1']

  const { error: packErr } = await supabase.from('packs').upsert(
    [
      {
        id: packId(packSlug),
        slug: packSlug,
        title: 'Formule 1: champions (pilotes)',
        description: 'Champion du monde de Formule 1 par annee.',
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
      front_md: `Champion F1 en ${entry.year}`,
      back_md: entry.champion,
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
  const res = await seedF1ChampionsPack()
  console.log(`pack_slug=${res.pack_slug} cards_upserted=${res.cards_upserted} cards_deleted=${res.cards_deleted}`)
}

