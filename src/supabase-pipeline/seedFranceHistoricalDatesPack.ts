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

function cardId(slug: string, key: string): string {
  return uuidv5(`card:${slug}:${key}`, NAMESPACE)
}

type EventDef = {
  key: string
  date_label: string
  event_fr: string
}

const EVENTS: EventDef[] = [
  { key: 'alesia', date_label: '52 av. J.-C.', event_fr: "Vercingetorix est vaincu a Alesia par Jules Cesar." },
  { key: 'bapteme-clovis', date_label: '496', event_fr: 'Bapteme de Clovis (date traditionnelle).' },
  { key: 'poitiers', date_label: '732', event_fr: 'Bataille de Poitiers.' },
  { key: 'charlemagne', date_label: '800', event_fr: "Charlemagne est couronne empereur d'Occident." },
  { key: 'verdun', date_label: '843', event_fr: "Traite de Verdun (partage de l'empire carolingien)." },
  { key: 'hugues-capet', date_label: '987', event_fr: 'Hugues Capet devient roi de France.' },
  { key: 'bouvines', date_label: '1214', event_fr: 'Victoire de Philippe Auguste a Bouvines.' },
  { key: 'etats-generaux', date_label: '1302', event_fr: 'Premiers Etats generaux du royaume de France.' },
  { key: 'debut-100-ans', date_label: '1337', event_fr: 'Debut de la guerre de Cent Ans.' },
  { key: 'orleans', date_label: '1429', event_fr: "Jeanne d'Arc participe a la levee du siege d'Orleans." },
  { key: 'fin-100-ans', date_label: '1453', event_fr: 'Fin de la guerre de Cent Ans.' },
  { key: 'marignan', date_label: '1515', event_fr: 'Victoire de Francois Ier a Marignan.' },
  { key: 'edit-nantes', date_label: '1598', event_fr: "Henri IV promulgue l'edit de Nantes." },
  { key: 'regne-personnel-l14', date_label: '1661', event_fr: 'Debut du regne personnel de Louis XIV.' },
  { key: 'revocation-nantes', date_label: '1685', event_fr: "Revocation de l'edit de Nantes." },
  { key: 'revolution', date_label: '1789', event_fr: 'Debut de la Revolution francaise (prise de la Bastille).' },
  { key: 'premiere-republique', date_label: '1792', event_fr: 'Proclamation de la Ire Republique.' },
  { key: 'napoleon-empereur', date_label: '1804', event_fr: 'Napoleon Bonaparte devient empereur.' },
  { key: 'waterloo', date_label: '1815', event_fr: 'Defaite de Waterloo.' },
  { key: 'abolition-esclavage', date_label: '1848', event_fr: "Abolition definitive de l'esclavage en France." },
  { key: 'troisieme-republique', date_label: '1870', event_fr: 'Proclamation de la IIIe Republique.' },
  { key: 'separation-eglise-etat', date_label: '1905', event_fr: "Loi de separation des Eglises et de l'Etat." },
  { key: 'debut-premiere-guerre', date_label: '1914', event_fr: 'Entree de la France dans la Premiere Guerre mondiale.' },
  { key: 'armistice-1918', date_label: '1918', event_fr: 'Armistice du 11 novembre.' },
  { key: 'appel-18-juin', date_label: '1940', event_fr: 'Appel du 18 juin du general de Gaulle.' },
  { key: 'liberation-paris', date_label: '1944', event_fr: 'Liberation de Paris.' },
  { key: 'quatrieme-republique', date_label: '1946', event_fr: 'Naissance de la IVe Republique.' },
  { key: 'cinquieme-republique', date_label: '1958', event_fr: 'Naissance de la Ve Republique.' },
  { key: 'suffrage-universel-direct', date_label: '1962', event_fr: 'Election du president au suffrage universel direct (referendum).' },
  { key: 'mai-68', date_label: '1968', event_fr: 'Mouvement de Mai 68.' },
  { key: 'abolition-peine-mort', date_label: '1981', event_fr: 'Abolition de la peine de mort en France.' },
  { key: 'maastricht', date_label: '1992', event_fr: 'Ratification francaise du traite de Maastricht.' },
  { key: 'euro-billets', date_label: '2002', event_fr: 'Mise en circulation des billets et pieces en euro.' }
]

export async function seedFranceHistoricalDatesPack(): Promise<{
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

  const packSlug = 'dates-cles-histoire-france'
  const now = new Date().toISOString()
  const tags = ['Histoire/France']

  const { error: packErr } = await supabase.from('packs').upsert(
    [
      {
        id: packId(packSlug),
        slug: packSlug,
        title: "Dates cles de l'histoire de France",
        description: 'Une date majeure et son evenement associe.',
        tags,
        created_at: now,
        updated_at: now
      }
    ],
    { onConflict: 'slug' }
  )
  if (packErr) throw new Error(`packs upsert failed (${packSlug}): ${packErr.message}`)

  const keepIds = new Set<string>()
  const cards = EVENTS.map((entry) => {
    const id = cardId(packSlug, entry.key)
    keepIds.add(id)
    return {
      id,
      pack_slug: packSlug,
      front_md: `Que se passe-t-il en ${entry.date_label} ?`,
      back_md: entry.event_fr,
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
  const res = await seedFranceHistoricalDatesPack()
  console.log(`pack_slug=${res.pack_slug} cards_upserted=${res.cards_upserted} cards_deleted=${res.cards_deleted}`)
}
