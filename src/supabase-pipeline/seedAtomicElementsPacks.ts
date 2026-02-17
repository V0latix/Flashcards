import './env.js'
import { createClient } from '@supabase/supabase-js'
import { v5 as uuidv5 } from 'uuid'
import { isMainModule } from './isMain.js'
import { assertServiceRoleKeyMatchesUrl } from './supabaseAuth.js'
import { assertDestructiveOperationAllowed } from './destructive.js'

const NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'

type ElementEntry = {
  atomic_number: number
  name_fr: string
  symbol: string
}

const ELEMENTS: ElementEntry[] = [
  { atomic_number: 1, name_fr: 'Hydrogene', symbol: 'H' },
  { atomic_number: 2, name_fr: 'Helium', symbol: 'He' },
  { atomic_number: 3, name_fr: 'Lithium', symbol: 'Li' },
  { atomic_number: 4, name_fr: 'Beryllium', symbol: 'Be' },
  { atomic_number: 5, name_fr: 'Bore', symbol: 'B' },
  { atomic_number: 6, name_fr: 'Carbone', symbol: 'C' },
  { atomic_number: 7, name_fr: 'Azote', symbol: 'N' },
  { atomic_number: 8, name_fr: 'Oxygene', symbol: 'O' },
  { atomic_number: 9, name_fr: 'Fluor', symbol: 'F' },
  { atomic_number: 10, name_fr: 'Neon', symbol: 'Ne' },
  { atomic_number: 11, name_fr: 'Sodium', symbol: 'Na' },
  { atomic_number: 12, name_fr: 'Magnesium', symbol: 'Mg' },
  { atomic_number: 13, name_fr: 'Aluminium', symbol: 'Al' },
  { atomic_number: 14, name_fr: 'Silicium', symbol: 'Si' },
  { atomic_number: 15, name_fr: 'Phosphore', symbol: 'P' },
  { atomic_number: 16, name_fr: 'Soufre', symbol: 'S' },
  { atomic_number: 17, name_fr: 'Chlore', symbol: 'Cl' },
  { atomic_number: 18, name_fr: 'Argon', symbol: 'Ar' },
  { atomic_number: 19, name_fr: 'Potassium', symbol: 'K' },
  { atomic_number: 20, name_fr: 'Calcium', symbol: 'Ca' },
  { atomic_number: 21, name_fr: 'Scandium', symbol: 'Sc' },
  { atomic_number: 22, name_fr: 'Titane', symbol: 'Ti' },
  { atomic_number: 23, name_fr: 'Vanadium', symbol: 'V' },
  { atomic_number: 24, name_fr: 'Chrome', symbol: 'Cr' },
  { atomic_number: 25, name_fr: 'Manganese', symbol: 'Mn' },
  { atomic_number: 26, name_fr: 'Fer', symbol: 'Fe' },
  { atomic_number: 27, name_fr: 'Cobalt', symbol: 'Co' },
  { atomic_number: 28, name_fr: 'Nickel', symbol: 'Ni' },
  { atomic_number: 29, name_fr: 'Cuivre', symbol: 'Cu' },
  { atomic_number: 30, name_fr: 'Zinc', symbol: 'Zn' },
  { atomic_number: 31, name_fr: 'Gallium', symbol: 'Ga' },
  { atomic_number: 32, name_fr: 'Germanium', symbol: 'Ge' },
  { atomic_number: 33, name_fr: 'Arsenic', symbol: 'As' },
  { atomic_number: 34, name_fr: 'Selenium', symbol: 'Se' },
  { atomic_number: 35, name_fr: 'Brome', symbol: 'Br' },
  { atomic_number: 36, name_fr: 'Krypton', symbol: 'Kr' },
  { atomic_number: 37, name_fr: 'Rubidium', symbol: 'Rb' },
  { atomic_number: 38, name_fr: 'Strontium', symbol: 'Sr' },
  { atomic_number: 39, name_fr: 'Yttrium', symbol: 'Y' },
  { atomic_number: 40, name_fr: 'Zirconium', symbol: 'Zr' },
  { atomic_number: 41, name_fr: 'Niobium', symbol: 'Nb' },
  { atomic_number: 42, name_fr: 'Molybdene', symbol: 'Mo' },
  { atomic_number: 43, name_fr: 'Technetium', symbol: 'Tc' },
  { atomic_number: 44, name_fr: 'Ruthenium', symbol: 'Ru' },
  { atomic_number: 45, name_fr: 'Rhodium', symbol: 'Rh' },
  { atomic_number: 46, name_fr: 'Palladium', symbol: 'Pd' },
  { atomic_number: 47, name_fr: 'Argent', symbol: 'Ag' },
  { atomic_number: 48, name_fr: 'Cadmium', symbol: 'Cd' },
  { atomic_number: 49, name_fr: 'Indium', symbol: 'In' },
  { atomic_number: 50, name_fr: 'Etain', symbol: 'Sn' },
  { atomic_number: 51, name_fr: 'Antimoine', symbol: 'Sb' },
  { atomic_number: 52, name_fr: 'Tellure', symbol: 'Te' },
  { atomic_number: 53, name_fr: 'Iode', symbol: 'I' },
  { atomic_number: 54, name_fr: 'Xenon', symbol: 'Xe' },
  { atomic_number: 55, name_fr: 'Cesium', symbol: 'Cs' },
  { atomic_number: 56, name_fr: 'Baryum', symbol: 'Ba' },
  { atomic_number: 57, name_fr: 'Lanthane', symbol: 'La' },
  { atomic_number: 58, name_fr: 'Cerium', symbol: 'Ce' },
  { atomic_number: 59, name_fr: 'Praseodyme', symbol: 'Pr' },
  { atomic_number: 60, name_fr: 'Neodyme', symbol: 'Nd' },
  { atomic_number: 61, name_fr: 'Promethium', symbol: 'Pm' },
  { atomic_number: 62, name_fr: 'Samarium', symbol: 'Sm' },
  { atomic_number: 63, name_fr: 'Europium', symbol: 'Eu' },
  { atomic_number: 64, name_fr: 'Gadolinium', symbol: 'Gd' },
  { atomic_number: 65, name_fr: 'Terbium', symbol: 'Tb' },
  { atomic_number: 66, name_fr: 'Dysprosium', symbol: 'Dy' },
  { atomic_number: 67, name_fr: 'Holmium', symbol: 'Ho' },
  { atomic_number: 68, name_fr: 'Erbium', symbol: 'Er' },
  { atomic_number: 69, name_fr: 'Thulium', symbol: 'Tm' },
  { atomic_number: 70, name_fr: 'Ytterbium', symbol: 'Yb' },
  { atomic_number: 71, name_fr: 'Lutecium', symbol: 'Lu' },
  { atomic_number: 72, name_fr: 'Hafnium', symbol: 'Hf' },
  { atomic_number: 73, name_fr: 'Tantale', symbol: 'Ta' },
  { atomic_number: 74, name_fr: 'Tungstene', symbol: 'W' },
  { atomic_number: 75, name_fr: 'Rhenium', symbol: 'Re' },
  { atomic_number: 76, name_fr: 'Osmium', symbol: 'Os' },
  { atomic_number: 77, name_fr: 'Iridium', symbol: 'Ir' },
  { atomic_number: 78, name_fr: 'Platine', symbol: 'Pt' },
  { atomic_number: 79, name_fr: 'Or', symbol: 'Au' },
  { atomic_number: 80, name_fr: 'Mercure', symbol: 'Hg' },
  { atomic_number: 81, name_fr: 'Thallium', symbol: 'Tl' },
  { atomic_number: 82, name_fr: 'Plomb', symbol: 'Pb' },
  { atomic_number: 83, name_fr: 'Bismuth', symbol: 'Bi' },
  { atomic_number: 84, name_fr: 'Polonium', symbol: 'Po' },
  { atomic_number: 85, name_fr: 'Astate', symbol: 'At' },
  { atomic_number: 86, name_fr: 'Radon', symbol: 'Rn' },
  { atomic_number: 87, name_fr: 'Francium', symbol: 'Fr' },
  { atomic_number: 88, name_fr: 'Radium', symbol: 'Ra' },
  { atomic_number: 89, name_fr: 'Actinium', symbol: 'Ac' },
  { atomic_number: 90, name_fr: 'Thorium', symbol: 'Th' },
  { atomic_number: 91, name_fr: 'Protactinium', symbol: 'Pa' },
  { atomic_number: 92, name_fr: 'Uranium', symbol: 'U' },
  { atomic_number: 93, name_fr: 'Neptunium', symbol: 'Np' },
  { atomic_number: 94, name_fr: 'Plutonium', symbol: 'Pu' },
  { atomic_number: 95, name_fr: 'Americium', symbol: 'Am' },
  { atomic_number: 96, name_fr: 'Curium', symbol: 'Cm' },
  { atomic_number: 97, name_fr: 'Berkelium', symbol: 'Bk' },
  { atomic_number: 98, name_fr: 'Californium', symbol: 'Cf' },
  { atomic_number: 99, name_fr: 'Einsteinium', symbol: 'Es' },
  { atomic_number: 100, name_fr: 'Fermium', symbol: 'Fm' },
  { atomic_number: 101, name_fr: 'Mendelevium', symbol: 'Md' },
  { atomic_number: 102, name_fr: 'Nobelium', symbol: 'No' },
  { atomic_number: 103, name_fr: 'Lawrencium', symbol: 'Lr' },
  { atomic_number: 104, name_fr: 'Rutherfordium', symbol: 'Rf' },
  { atomic_number: 105, name_fr: 'Dubnium', symbol: 'Db' },
  { atomic_number: 106, name_fr: 'Seaborgium', symbol: 'Sg' },
  { atomic_number: 107, name_fr: 'Bohrium', symbol: 'Bh' },
  { atomic_number: 108, name_fr: 'Hassium', symbol: 'Hs' },
  { atomic_number: 109, name_fr: 'Meitnerium', symbol: 'Mt' },
  { atomic_number: 110, name_fr: 'Darmstadtium', symbol: 'Ds' },
  { atomic_number: 111, name_fr: 'Roentgenium', symbol: 'Rg' },
  { atomic_number: 112, name_fr: 'Copernicium', symbol: 'Cn' },
  { atomic_number: 113, name_fr: 'Nihonium', symbol: 'Nh' },
  { atomic_number: 114, name_fr: 'Flerovium', symbol: 'Fl' },
  { atomic_number: 115, name_fr: 'Moscovium', symbol: 'Mc' },
  { atomic_number: 116, name_fr: 'Livermorium', symbol: 'Lv' },
  { atomic_number: 117, name_fr: 'Tennessine', symbol: 'Ts' },
  { atomic_number: 118, name_fr: 'Oganesson', symbol: 'Og' }
]

type SeedResult = {
  pack_slug: string
  cards_upserted: number
  cards_deleted: number
}

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

function startsWithVowelOrH(value: string): boolean {
  return /^[aeiouhy]/i.test(value.trim())
}

function symbolFront(name_fr: string): string {
  if (startsWithVowelOrH(name_fr)) {
    return `Quel est le symbole chimique de l'${name_fr} ?`
  }
  return `Quel est le symbole chimique du ${name_fr} ?`
}

async function seedPack(params: {
  supabaseUrl: string
  serviceKey: string
  pack_slug: string
  title: string
  description: string
  tags: string[]
  cards: Array<{ key: string; front_md: string; back_md: string }>
}): Promise<SeedResult> {
  const { supabaseUrl, serviceKey, pack_slug, title, description, tags, cards } = params

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  const now = new Date().toISOString()

  const { error: packErr } = await supabase.from('packs').upsert(
    [
      {
        id: packId(pack_slug),
        slug: pack_slug,
        title,
        description,
        tags,
        created_at: now,
        updated_at: now
      }
    ],
    { onConflict: 'slug' }
  )
  if (packErr) throw new Error(`packs upsert failed (${pack_slug}): ${packErr.message}`)

  const keepIds = new Set<string>()
  const payload = cards.map((entry) => {
    const id = cardId(pack_slug, entry.key)
    keepIds.add(id)
    return {
      id,
      pack_slug,
      front_md: entry.front_md,
      back_md: entry.back_md,
      tags,
      created_at: now,
      updated_at: now
    }
  })

  const chunkSize = 500
  let upserted = 0
  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize)
    const { error } = await supabase.from('public_cards').upsert(chunk, { onConflict: 'id' })
    if (error) throw new Error(`public_cards upsert failed (${pack_slug} chunk ${i}): ${error.message}`)
    upserted += chunk.length
  }

  const pageSize = 1000
  let offset = 0
  const toDelete: string[] = []
  while (true) {
    const { data, error } = await supabase
      .from('public_cards')
      .select('id')
      .eq('pack_slug', pack_slug)
      .range(offset, offset + pageSize - 1)
    if (error) throw new Error(`list public_cards failed (${pack_slug}): ${error.message}`)
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
      if (error) throw new Error(`delete public_cards failed (${pack_slug}): ${error.message}`)
      deleted += chunk.length
    }
  }

  return { pack_slug, cards_upserted: upserted, cards_deleted: deleted }
}

export async function seedAtomicElementsPacks(): Promise<{
  atomic_numbers: SeedResult
  element_symbols: SeedResult
}> {
  const supabaseUrl = requireEnv('SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  assertServiceRoleKeyMatchesUrl(supabaseUrl, serviceKey)

  const sorted = ELEMENTS.slice().sort((a, b) => a.atomic_number - b.atomic_number)

  const atomicNumbers = await seedPack({
    supabaseUrl,
    serviceKey,
    pack_slug: 'numeros-atomiques-elements',
    title: 'Numéros atomiques des éléments',
    description: 'Associer chaque élément à son numéro atomique (Z).',
    tags: ['Science/Chimie'],
    cards: sorted.map((e) => ({
      key: `z-${e.atomic_number}`,
      front_md: `Quel est le numéro atomique de ${e.name_fr} (${e.symbol}) ?`,
      back_md: `Z = ${e.atomic_number}`
    }))
  })

  const elementSymbols = await seedPack({
    supabaseUrl,
    serviceKey,
    pack_slug: 'symboles-chimiques-elements',
    title: 'Symboles chimiques des éléments',
    description: 'Retrouver le symbole chimique de chaque élément.',
    tags: ['Science/Chimie'],
    cards: sorted.map((e) => ({
      key: `symbol-${e.atomic_number}`,
      front_md: symbolFront(e.name_fr),
      back_md: e.symbol
    }))
  })

  return {
    atomic_numbers: atomicNumbers,
    element_symbols: elementSymbols
  }
}

if (isMainModule(import.meta.url)) {
  const res = await seedAtomicElementsPacks()
  console.log(
    `atomic_pack=${res.atomic_numbers.pack_slug} upserted=${res.atomic_numbers.cards_upserted} deleted=${res.atomic_numbers.cards_deleted}`
  )
  console.log(
    `symbols_pack=${res.element_symbols.pack_slug} upserted=${res.element_symbols.cards_upserted} deleted=${res.element_symbols.cards_deleted}`
  )
}
