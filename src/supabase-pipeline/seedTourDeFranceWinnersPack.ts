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
  winner: string
}

const NO_EDITION_YEARS = new Set<number>([
  1915, 1916, 1917, 1918, 1940, 1941, 1942, 1943, 1944, 1945, 1946
])

const DISQUALIFIED_WINNERS: Record<number, string> = {
  1999: 'Lance Armstrong (titre retire)',
  2000: 'Lance Armstrong (titre retire)',
  2001: 'Lance Armstrong (titre retire)',
  2002: 'Lance Armstrong (titre retire)',
  2003: 'Lance Armstrong (titre retire)',
  2004: 'Lance Armstrong (titre retire)',
  2005: 'Lance Armstrong (titre retire)'
}

const OFFICIAL_WINNERS: Record<number, string> = {
  1903: 'Maurice Garin',
  1904: 'Henri Cornet',
  1905: 'Louis Trousselier',
  1906: 'Rene Pottier',
  1907: 'Lucien Petit-Breton',
  1908: 'Lucien Petit-Breton',
  1909: 'Francois Faber',
  1910: 'Octave Lapize',
  1911: 'Gustave Garrigou',
  1912: 'Odile Defraye',
  1913: 'Philippe Thys',
  1914: 'Philippe Thys',
  1919: 'Firmin Lambot',
  1920: 'Philippe Thys',
  1921: 'Leon Scieur',
  1922: 'Firmin Lambot',
  1923: 'Henri Pelissier',
  1924: 'Ottavio Bottecchia',
  1925: 'Ottavio Bottecchia',
  1926: 'Lucien Buysse',
  1927: 'Nicolas Frantz',
  1928: 'Nicolas Frantz',
  1929: 'Maurice De Waele',
  1930: 'Andre Leducq',
  1931: 'Antonin Magne',
  1932: 'Andre Leducq',
  1933: 'Georges Speicher',
  1934: 'Antonin Magne',
  1935: 'Romain Maes',
  1936: 'Sylvere Maes',
  1937: 'Roger Lapebie',
  1938: 'Gino Bartali',
  1939: 'Sylvere Maes',
  1947: 'Jean Robic',
  1948: 'Gino Bartali',
  1949: 'Fausto Coppi',
  1950: 'Ferdinand Kubler',
  1951: 'Hugo Koblet',
  1952: 'Fausto Coppi',
  1953: 'Louison Bobet',
  1954: 'Louison Bobet',
  1955: 'Louison Bobet',
  1956: 'Roger Walkowiak',
  1957: 'Jacques Anquetil',
  1958: 'Charly Gaul',
  1959: 'Federico Bahamontes',
  1960: 'Gastone Nencini',
  1961: 'Jacques Anquetil',
  1962: 'Jacques Anquetil',
  1963: 'Jacques Anquetil',
  1964: 'Jacques Anquetil',
  1965: 'Felice Gimondi',
  1966: 'Lucien Aimar',
  1967: 'Roger Pingeon',
  1968: 'Jan Janssen',
  1969: 'Eddy Merckx',
  1970: 'Eddy Merckx',
  1971: 'Eddy Merckx',
  1972: 'Eddy Merckx',
  1973: 'Luis Ocana',
  1974: 'Eddy Merckx',
  1975: 'Bernard Thevenet',
  1976: 'Lucien Van Impe',
  1977: 'Bernard Thevenet',
  1978: 'Bernard Hinault',
  1979: 'Bernard Hinault',
  1980: 'Joop Zoetemelk',
  1981: 'Bernard Hinault',
  1982: 'Bernard Hinault',
  1983: 'Laurent Fignon',
  1984: 'Laurent Fignon',
  1985: 'Bernard Hinault',
  1986: 'Greg LeMond',
  1987: 'Stephen Roche',
  1988: 'Pedro Delgado',
  1989: 'Greg LeMond',
  1990: 'Greg LeMond',
  1991: 'Miguel Indurain',
  1992: 'Miguel Indurain',
  1993: 'Miguel Indurain',
  1994: 'Miguel Indurain',
  1995: 'Miguel Indurain',
  1996: 'Bjarne Riis',
  1997: 'Jan Ullrich',
  1998: 'Marco Pantani',
  2006: 'Oscar Pereiro',
  2007: 'Alberto Contador',
  2008: 'Carlos Sastre',
  2009: 'Alberto Contador',
  2010: 'Andy Schleck',
  2011: 'Cadel Evans',
  2012: 'Bradley Wiggins',
  2013: 'Chris Froome',
  2014: 'Vincenzo Nibali',
  2015: 'Chris Froome',
  2016: 'Chris Froome',
  2017: 'Chris Froome',
  2018: 'Geraint Thomas',
  2019: 'Egan Bernal',
  2020: 'Tadej Pogacar',
  2021: 'Tadej Pogacar',
  2022: 'Jonas Vingegaard',
  2023: 'Jonas Vingegaard',
  2024: 'Tadej Pogacar',
  2025: 'Tadej Pogacar'
}

const START_YEAR = 1903
const END_YEAR = 2025

const EDITIONS: Edition[] = []
for (let year = START_YEAR; year <= END_YEAR; year += 1) {
  if (NO_EDITION_YEARS.has(year)) {
    EDITIONS.push({ year, winner: "Aucun (pas d'edition)" })
    continue
  }
  if (DISQUALIFIED_WINNERS[year]) {
    EDITIONS.push({ year, winner: DISQUALIFIED_WINNERS[year] })
    continue
  }
  const winner = OFFICIAL_WINNERS[year]
  if (!winner) {
    throw new Error(`Missing Tour de France winner mapping for year ${year}`)
  }
  EDITIONS.push({ year, winner })
}

export async function seedTourDeFranceWinnersPack(): Promise<{
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

  const packSlug = 'vainqueurs-tour-de-france'
  const now = new Date().toISOString()
  const tags = ['Sport/Cyclisme']

  const { error: packErr } = await supabase.from('packs').upsert(
    [
      {
        id: packId(packSlug),
        slug: packSlug,
        title: 'Tour de France: vainqueurs',
        description: 'Vainqueur du Tour de France par annee.',
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
      front_md: `Vainqueur Tour de France en ${entry.year}`,
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
  const res = await seedTourDeFranceWinnersPack()
  console.log(`pack_slug=${res.pack_slug} cards_upserted=${res.cards_upserted} cards_deleted=${res.cards_deleted}`)
}
