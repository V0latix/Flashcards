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

function cardId(slug: string, season: 'summer' | 'winter', year: number): string {
  return uuidv5(`card:${slug}:${season}:${year}`, NAMESPACE)
}

type OlympicEdition = {
  season: 'summer' | 'winter'
  year: number
  city_fr: string
  country_fr: string
}

// Modern Olympics: include all held editions (Summer since 1896, Winter since 1924) + confirmed future hosts.
// Canceled editions (1916/1940/1944 Summer, 1940/1944 Winter) are intentionally excluded.
const EDITIONS: OlympicEdition[] = [
  // Summer
  { season: 'summer', year: 1896, city_fr: 'Athènes', country_fr: 'Grèce' },
  { season: 'summer', year: 1900, city_fr: 'Paris', country_fr: 'France' },
  { season: 'summer', year: 1904, city_fr: 'Saint-Louis', country_fr: 'États-Unis' },
  { season: 'summer', year: 1908, city_fr: 'Londres', country_fr: 'Royaume-Uni' },
  { season: 'summer', year: 1912, city_fr: 'Stockholm', country_fr: 'Suède' },
  { season: 'summer', year: 1920, city_fr: 'Anvers', country_fr: 'Belgique' },
  { season: 'summer', year: 1924, city_fr: 'Paris', country_fr: 'France' },
  { season: 'summer', year: 1928, city_fr: 'Amsterdam', country_fr: 'Pays-Bas' },
  { season: 'summer', year: 1932, city_fr: 'Los Angeles', country_fr: 'États-Unis' },
  { season: 'summer', year: 1936, city_fr: 'Berlin', country_fr: 'Allemagne' },
  { season: 'summer', year: 1948, city_fr: 'Londres', country_fr: 'Royaume-Uni' },
  { season: 'summer', year: 1952, city_fr: 'Helsinki', country_fr: 'Finlande' },
  { season: 'summer', year: 1956, city_fr: 'Melbourne', country_fr: 'Australie' },
  { season: 'summer', year: 1960, city_fr: 'Rome', country_fr: 'Italie' },
  { season: 'summer', year: 1964, city_fr: 'Tokyo', country_fr: 'Japon' },
  { season: 'summer', year: 1968, city_fr: 'Mexico', country_fr: 'Mexique' },
  { season: 'summer', year: 1972, city_fr: 'Munich', country_fr: 'Allemagne' },
  { season: 'summer', year: 1976, city_fr: 'Montréal', country_fr: 'Canada' },
  { season: 'summer', year: 1980, city_fr: 'Moscou', country_fr: 'Union soviétique' },
  { season: 'summer', year: 1984, city_fr: 'Los Angeles', country_fr: 'États-Unis' },
  { season: 'summer', year: 1988, city_fr: 'Séoul', country_fr: 'Corée du Sud' },
  { season: 'summer', year: 1992, city_fr: 'Barcelone', country_fr: 'Espagne' },
  { season: 'summer', year: 1996, city_fr: 'Atlanta', country_fr: 'États-Unis' },
  { season: 'summer', year: 2000, city_fr: 'Sydney', country_fr: 'Australie' },
  { season: 'summer', year: 2004, city_fr: 'Athènes', country_fr: 'Grèce' },
  { season: 'summer', year: 2008, city_fr: 'Pékin', country_fr: 'Chine' },
  { season: 'summer', year: 2012, city_fr: 'Londres', country_fr: 'Royaume-Uni' },
  { season: 'summer', year: 2016, city_fr: 'Rio de Janeiro', country_fr: 'Brésil' },
  { season: 'summer', year: 2020, city_fr: 'Tokyo', country_fr: 'Japon' },
  { season: 'summer', year: 2024, city_fr: 'Paris', country_fr: 'France' },
  { season: 'summer', year: 2028, city_fr: 'Los Angeles', country_fr: 'États-Unis' },
  { season: 'summer', year: 2032, city_fr: 'Brisbane', country_fr: 'Australie' },

  // Winter
  { season: 'winter', year: 1924, city_fr: 'Chamonix', country_fr: 'France' },
  { season: 'winter', year: 1928, city_fr: 'Saint-Moritz', country_fr: 'Suisse' },
  { season: 'winter', year: 1932, city_fr: 'Lake Placid', country_fr: 'États-Unis' },
  { season: 'winter', year: 1936, city_fr: 'Garmisch-Partenkirchen', country_fr: 'Allemagne' },
  { season: 'winter', year: 1948, city_fr: 'Saint-Moritz', country_fr: 'Suisse' },
  { season: 'winter', year: 1952, city_fr: 'Oslo', country_fr: 'Norvège' },
  { season: 'winter', year: 1956, city_fr: "Cortina d'Ampezzo", country_fr: 'Italie' },
  { season: 'winter', year: 1960, city_fr: 'Squaw Valley', country_fr: 'États-Unis' },
  { season: 'winter', year: 1964, city_fr: 'Innsbruck', country_fr: 'Autriche' },
  { season: 'winter', year: 1968, city_fr: 'Grenoble', country_fr: 'France' },
  { season: 'winter', year: 1972, city_fr: 'Sapporo', country_fr: 'Japon' },
  { season: 'winter', year: 1976, city_fr: 'Innsbruck', country_fr: 'Autriche' },
  { season: 'winter', year: 1980, city_fr: 'Lake Placid', country_fr: 'États-Unis' },
  { season: 'winter', year: 1984, city_fr: 'Sarajevo', country_fr: 'Yougoslavie' },
  { season: 'winter', year: 1988, city_fr: 'Calgary', country_fr: 'Canada' },
  { season: 'winter', year: 1992, city_fr: 'Albertville', country_fr: 'France' },
  { season: 'winter', year: 1994, city_fr: 'Lillehammer', country_fr: 'Norvège' },
  { season: 'winter', year: 1998, city_fr: 'Nagano', country_fr: 'Japon' },
  { season: 'winter', year: 2002, city_fr: 'Salt Lake City', country_fr: 'États-Unis' },
  { season: 'winter', year: 2006, city_fr: 'Turin', country_fr: 'Italie' },
  { season: 'winter', year: 2010, city_fr: 'Vancouver', country_fr: 'Canada' },
  { season: 'winter', year: 2014, city_fr: 'Sotchi', country_fr: 'Russie' },
  { season: 'winter', year: 2018, city_fr: 'Pyeongchang', country_fr: 'Corée du Sud' },
  { season: 'winter', year: 2022, city_fr: 'Pékin', country_fr: 'Chine' },
  { season: 'winter', year: 2026, city_fr: 'Milano-Cortina', country_fr: 'Italie' },
  { season: 'winter', year: 2030, city_fr: 'Alpes françaises', country_fr: 'France' },
  { season: 'winter', year: 2034, city_fr: 'Salt Lake City', country_fr: 'États-Unis' }
]

function seasonLabelFr(season: 'summer' | 'winter'): string {
  return season === 'summer' ? "d'été" : "d'hiver"
}

export async function seedOlympicsHostCitiesPack(): Promise<{
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

  const packSlug = 'jo-villes-hotes'
  const now = new Date().toISOString()
  const tags = ['Sport/JO']

  const { error: packErr } = await supabase.from('packs').upsert(
    [
      {
        id: packId(packSlug),
        slug: packSlug,
        title: 'Villes hôtes des JO (modernes)',
        description: 'JO modernes: toutes les éditions tenues (été + hiver) + futures confirmées.',
        tags,
        created_at: now,
        updated_at: now
      }
    ],
    { onConflict: 'slug' }
  )
  if (packErr) throw new Error(`packs upsert failed (${packSlug}): ${packErr.message}`)

  // Stable order (winter/summer mixed by year).
  const editions = [...EDITIONS].sort((a, b) => (a.year - b.year) || a.season.localeCompare(b.season))

  const keepIds = new Set<string>()
  const cards = editions.map((e) => {
    const id = cardId(packSlug, e.season, e.year)
    keepIds.add(id)

    const front =
      e.season === 'summer'
        ? `Ville Hote JO ${e.year}`
        : `Ville Hote JO Hiver ${e.year}`
    const back = `${e.city_fr}, ${e.country_fr}`

    return {
      id,
      pack_slug: packSlug,
      front_md: front,
      back_md: back,
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
  const res = await seedOlympicsHostCitiesPack()
  console.log(`pack_slug=${res.pack_slug} cards_upserted=${res.cards_upserted} cards_deleted=${res.cards_deleted}`)
}
