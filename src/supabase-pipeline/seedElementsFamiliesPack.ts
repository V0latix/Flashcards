import './env.js'
import { createClient } from '@supabase/supabase-js'
import { v5 as uuidv5 } from 'uuid'
import { isMainModule } from './isMain.js'
import { assertServiceRoleKeyMatchesUrl } from './supabaseAuth.js'
import { assertDestructiveOperationAllowed } from './destructive.js'
import { ELEMENTS } from './seedAtomicElementsPacks.js'

const NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'

const ALKALI_METALS = new Set([3, 11, 19, 37, 55, 87])
const ALKALINE_EARTH_METALS = new Set([4, 12, 20, 38, 56, 88])
const HALOGENS = new Set([9, 17, 35, 53, 85, 117])
const NOBLE_GASES = new Set([2, 10, 18, 36, 54, 86, 118])
const NON_METALS = new Set([1, 6, 7, 8, 15, 16, 34])
const METALLOIDS = new Set([5, 14, 32, 33, 51, 52])
const POST_TRANSITION_METALS = new Set([13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116])

function requireEnv(name: string): string {
  const v = process.env[name]
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s) throw new Error(`Missing ${name} in environment`)
  return s
}

function packId(slug: string): string {
  return uuidv5(`pack:${slug}`, NAMESPACE)
}

function cardId(slug: string, key: string): string {
  return uuidv5(`card:${slug}:${key}`, NAMESPACE)
}

function familyForAtomicNumber(atomicNumber: number): string {
  if (atomicNumber >= 57 && atomicNumber <= 71) return 'Lanthanide'
  if (atomicNumber >= 89 && atomicNumber <= 103) return 'Actinide'
  if (ALKALI_METALS.has(atomicNumber)) return 'Metal alcalin'
  if (ALKALINE_EARTH_METALS.has(atomicNumber)) return 'Metal alcalino-terreux'
  if (HALOGENS.has(atomicNumber)) return 'Halogene'
  if (NOBLE_GASES.has(atomicNumber)) return 'Gaz noble'
  if (NON_METALS.has(atomicNumber)) return 'Non-metal'
  if (METALLOIDS.has(atomicNumber)) return 'Metalloide'
  if (POST_TRANSITION_METALS.has(atomicNumber)) return 'Metal pauvre'
  return 'Metal de transition'
}

export async function seedElementsFamiliesPack(): Promise<{
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

  const packSlug = 'elements-chimiques-familles'
  const now = new Date().toISOString()
  const tags = ['Science/Chimie']

  const { error: packErr } = await supabase.from('packs').upsert(
    [
      {
        id: packId(packSlug),
        slug: packSlug,
        title: 'Elements chimiques: familles',
        description: 'Associer chaque element a sa famille chimique (classification pedagogique simplifiee).',
        tags,
        created_at: now,
        updated_at: now
      }
    ],
    { onConflict: 'slug' }
  )
  if (packErr) throw new Error(`packs upsert failed (${packSlug}): ${packErr.message}`)

  const sorted = ELEMENTS.slice().sort((a, b) => a.atomic_number - b.atomic_number)
  const keepIds = new Set<string>()
  const cards = sorted.map((entry) => {
    const id = cardId(packSlug, `family-${entry.atomic_number}`)
    keepIds.add(id)
    return {
      id,
      pack_slug: packSlug,
      front_md: `Famille chimique de ${entry.name_fr} (${entry.symbol})`,
      back_md: familyForAtomicNumber(entry.atomic_number),
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
  const res = await seedElementsFamiliesPack()
  console.log(`pack_slug=${res.pack_slug} cards_upserted=${res.cards_upserted} cards_deleted=${res.cards_deleted}`)
}
