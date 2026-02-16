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
  host_fr: string
  winner_fr: string
}

// Rugby World Cup (men) editions held.
const EDITIONS: Edition[] = [
  { year: 1987, host_fr: 'Nouvelle-Zélande/Australie', winner_fr: 'Nouvelle-Zélande' },
  {
    year: 1991,
    host_fr: 'Angleterre/France/Irlande/Écosse/Pays de Galles',
    winner_fr: 'Australie'
  },
  { year: 1995, host_fr: 'Afrique du Sud', winner_fr: 'Afrique du Sud' },
  { year: 1999, host_fr: 'Pays de Galles', winner_fr: 'Australie' },
  { year: 2003, host_fr: 'Australie', winner_fr: 'Angleterre' },
  { year: 2007, host_fr: 'France', winner_fr: 'Afrique du Sud' },
  { year: 2011, host_fr: 'Nouvelle-Zélande', winner_fr: 'Nouvelle-Zélande' },
  { year: 2015, host_fr: 'Angleterre', winner_fr: 'Nouvelle-Zélande' },
  { year: 2019, host_fr: 'Japon', winner_fr: 'Afrique du Sud' },
  { year: 2023, host_fr: 'France', winner_fr: 'Afrique du Sud' }
]

export async function seedWorldCupRugbyPack(): Promise<{
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

  const packSlug = 'coupe-du-monde-rugby'
  const now = new Date().toISOString()
  const tags = ['Sport/Rugby']

  const { error: packErr } = await supabase.from('packs').upsert(
    [
      {
        id: packId(packSlug),
        slug: packSlug,
        title: 'Coupe du monde Rugby: hôte et vainqueurs',
        description: "Coupe du monde de rugby (hommes): pays hôte et vainqueur par édition (toutes les éditions jouées).",
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
      back_md: `Hôte: ${e.host_fr}\nVainqueur: ${e.winner_fr}`,
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
  const res = await seedWorldCupRugbyPack()
  console.log(`pack_slug=${res.pack_slug} cards_upserted=${res.cards_upserted} cards_deleted=${res.cards_deleted}`)
}
