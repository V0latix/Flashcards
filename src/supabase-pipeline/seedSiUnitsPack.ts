import './env.js'
import { createClient } from '@supabase/supabase-js'
import { v5 as uuidv5 } from 'uuid'
import { isMainModule } from './isMain.js'
import { assertServiceRoleKeyMatchesUrl } from './supabaseAuth.js'
import { assertDestructiveOperationAllowed } from './destructive.js'

const NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'

type UnitEntry = {
  key: string
  quantity: string
  unit: string
  symbol: string
}

const SI_UNITS: UnitEntry[] = [
  { key: 'length', quantity: 'longueur', unit: 'metre', symbol: 'm' },
  { key: 'mass', quantity: 'masse', unit: 'kilogramme', symbol: 'kg' },
  { key: 'time', quantity: 'temps', unit: 'seconde', symbol: 's' },
  { key: 'electric-current', quantity: 'intensite electrique', unit: 'ampere', symbol: 'A' },
  { key: 'temperature', quantity: 'temperature thermodynamique', unit: 'kelvin', symbol: 'K' },
  { key: 'amount', quantity: 'quantite de matiere', unit: 'mole', symbol: 'mol' },
  { key: 'luminous-intensity', quantity: 'intensite lumineuse', unit: 'candela', symbol: 'cd' },
  { key: 'frequency', quantity: 'frequence', unit: 'hertz', symbol: 'Hz' },
  { key: 'force', quantity: 'force', unit: 'newton', symbol: 'N' },
  { key: 'pressure', quantity: 'pression', unit: 'pascal', symbol: 'Pa' },
  { key: 'energy', quantity: 'energie', unit: 'joule', symbol: 'J' },
  { key: 'power', quantity: 'puissance', unit: 'watt', symbol: 'W' },
  { key: 'charge', quantity: 'charge electrique', unit: 'coulomb', symbol: 'C' },
  { key: 'voltage', quantity: 'tension electrique', unit: 'volt', symbol: 'V' },
  { key: 'capacitance', quantity: 'capacite electrique', unit: 'farad', symbol: 'F' },
  { key: 'resistance', quantity: 'resistance electrique', unit: 'ohm', symbol: 'Ohm' },
  { key: 'conductance', quantity: 'conductance electrique', unit: 'siemens', symbol: 'S' },
  { key: 'magnetic-flux', quantity: 'flux magnetique', unit: 'weber', symbol: 'Wb' },
  { key: 'magnetic-induction', quantity: 'induction magnetique', unit: 'tesla', symbol: 'T' },
  { key: 'inductance', quantity: 'inductance', unit: 'henry', symbol: 'H' },
  { key: 'luminous-flux', quantity: 'flux lumineux', unit: 'lumen', symbol: 'lm' },
  { key: 'illuminance', quantity: 'eclairement', unit: 'lux', symbol: 'lx' },
  { key: 'radioactivity', quantity: 'activite radioactive', unit: 'becquerel', symbol: 'Bq' },
  { key: 'absorbed-dose', quantity: 'dose absorbee', unit: 'gray', symbol: 'Gy' },
  { key: 'equivalent-dose', quantity: 'dose equivalente', unit: 'sievert', symbol: 'Sv' },
  { key: 'catalytic-activity', quantity: 'activite catalytique', unit: 'katal', symbol: 'kat' }
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

function cardId(slug: string, key: string): string {
  return uuidv5(`card:${slug}:${key}`, NAMESPACE)
}

export async function seedSiUnitsPack(): Promise<{
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

  const packSlug = 'unites-si-grandeurs'
  const now = new Date().toISOString()
  const tags = ['Science/Physique']

  const { error: packErr } = await supabase.from('packs').upsert(
    [
      {
        id: packId(packSlug),
        slug: packSlug,
        title: 'Unites SI et grandeurs',
        description: 'Associer chaque grandeur physique a son unite SI (avec symbole).',
        tags,
        created_at: now,
        updated_at: now
      }
    ],
    { onConflict: 'slug' }
  )
  if (packErr) throw new Error(`packs upsert failed (${packSlug}): ${packErr.message}`)

  const entries = SI_UNITS.slice().sort((a, b) => a.quantity.localeCompare(b.quantity))
  const keepIds = new Set<string>()
  const cards = entries.map((entry) => {
    const id = cardId(packSlug, entry.key)
    keepIds.add(id)
    return {
      id,
      pack_slug: packSlug,
      front_md: `Unite SI de la grandeur: ${entry.quantity}`,
      back_md: `${entry.unit} (${entry.symbol})`,
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
  const res = await seedSiUnitsPack()
  console.log(`pack_slug=${res.pack_slug} cards_upserted=${res.cards_upserted} cards_deleted=${res.cards_deleted}`)
}
