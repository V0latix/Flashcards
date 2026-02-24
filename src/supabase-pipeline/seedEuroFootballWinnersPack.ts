import './env.js'
import { createClient } from '@supabase/supabase-js'
import { v5 as uuidv5 } from 'uuid'
import { isMainModule } from './isMain.js'
import { assertServiceRoleKeyMatchesUrl } from './supabaseAuth.js'
import { assertDestructiveOperationAllowed } from './destructive.js'

const NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'

type Edition = {
  year: number
  host_fr: string
  winner_fr: string
}

const EDITIONS: Edition[] = [
  { year: 1960, host_fr: 'France', winner_fr: 'URSS' },
  { year: 1964, host_fr: 'Espagne', winner_fr: 'Espagne' },
  { year: 1968, host_fr: 'Italie', winner_fr: 'Italie' },
  { year: 1972, host_fr: 'Belgique', winner_fr: 'Allemagne de l Ouest' },
  { year: 1976, host_fr: 'Yougoslavie', winner_fr: 'Tchecoslovaquie' },
  { year: 1980, host_fr: 'Italie', winner_fr: 'Allemagne de l Ouest' },
  { year: 1984, host_fr: 'France', winner_fr: 'France' },
  { year: 1988, host_fr: 'Allemagne de l Ouest', winner_fr: 'Pays-Bas' },
  { year: 1992, host_fr: 'Suede', winner_fr: 'Danemark' },
  { year: 1996, host_fr: 'Angleterre', winner_fr: 'Allemagne' },
  { year: 2000, host_fr: 'Belgique/Pays-Bas', winner_fr: 'France' },
  { year: 2004, host_fr: 'Portugal', winner_fr: 'Grece' },
  { year: 2008, host_fr: 'Autriche/Suisse', winner_fr: 'Espagne' },
  { year: 2012, host_fr: 'Pologne/Ukraine', winner_fr: 'Espagne' },
  { year: 2016, host_fr: 'France', winner_fr: 'Portugal' },
  { year: 2020, host_fr: 'Europe (multivilles)', winner_fr: 'Italie' },
  { year: 2024, host_fr: 'Allemagne', winner_fr: 'Espagne' }
]

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

export async function seedEuroFootballWinnersPack(): Promise<{
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

  const packSlug = 'euro-football-vainqueurs'
  const now = new Date().toISOString()
  const tags = ['Sport/Football']

  const { error: packErr } = await supabase.from('packs').upsert(
    [
      {
        id: packId(packSlug),
        slug: packSlug,
        title: 'Euro de football: hotes et vainqueurs',
        description: 'Euro de football (hommes): pays hote et vainqueur par edition jouee.',
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
      front_md: `Hote et vainqueur Euro ${entry.year}`,
      back_md: `Hote: ${entry.host_fr}\nVainqueur: ${entry.winner_fr}`,
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
  const res = await seedEuroFootballWinnersPack()
  console.log(`pack_slug=${res.pack_slug} cards_upserted=${res.cards_upserted} cards_deleted=${res.cards_deleted}`)
}
