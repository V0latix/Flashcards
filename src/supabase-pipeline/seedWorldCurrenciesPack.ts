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

function cardId(slug: string, country: string): string {
  return uuidv5(`card:${slug}:${country.toLowerCase()}`, NAMESPACE)
}

type CurrencyCard = {
  country_fr: string
  currency_fr: string
  code: string
}

const CARDS: CurrencyCard[] = [
  { country_fr: 'France', currency_fr: 'Euro', code: 'EUR' },
  { country_fr: 'Allemagne', currency_fr: 'Euro', code: 'EUR' },
  { country_fr: 'Espagne', currency_fr: 'Euro', code: 'EUR' },
  { country_fr: 'Italie', currency_fr: 'Euro', code: 'EUR' },
  { country_fr: 'Portugal', currency_fr: 'Euro', code: 'EUR' },
  { country_fr: 'Pays-Bas', currency_fr: 'Euro', code: 'EUR' },
  { country_fr: 'Belgique', currency_fr: 'Euro', code: 'EUR' },
  { country_fr: 'Luxembourg', currency_fr: 'Euro', code: 'EUR' },
  { country_fr: 'Irlande', currency_fr: 'Euro', code: 'EUR' },
  { country_fr: 'Autriche', currency_fr: 'Euro', code: 'EUR' },
  { country_fr: 'Grèce', currency_fr: 'Euro', code: 'EUR' },
  { country_fr: 'Finlande', currency_fr: 'Euro', code: 'EUR' },
  { country_fr: 'Slovaquie', currency_fr: 'Euro', code: 'EUR' },
  { country_fr: 'Slovénie', currency_fr: 'Euro', code: 'EUR' },
  { country_fr: 'Estonie', currency_fr: 'Euro', code: 'EUR' },
  { country_fr: 'Lettonie', currency_fr: 'Euro', code: 'EUR' },
  { country_fr: 'Lituanie', currency_fr: 'Euro', code: 'EUR' },
  { country_fr: 'Croatie', currency_fr: 'Euro', code: 'EUR' },
  { country_fr: 'États-Unis', currency_fr: 'Dollar américain', code: 'USD' },
  { country_fr: 'Canada', currency_fr: 'Dollar canadien', code: 'CAD' },
  { country_fr: 'Mexique', currency_fr: 'Peso mexicain', code: 'MXN' },
  { country_fr: 'Brésil', currency_fr: 'Real brésilien', code: 'BRL' },
  { country_fr: 'Argentine', currency_fr: 'Peso argentin', code: 'ARS' },
  { country_fr: 'Chili', currency_fr: 'Peso chilien', code: 'CLP' },
  { country_fr: 'Colombie', currency_fr: 'Peso colombien', code: 'COP' },
  { country_fr: 'Pérou', currency_fr: 'Sol', code: 'PEN' },
  { country_fr: 'Uruguay', currency_fr: 'Peso uruguayen', code: 'UYU' },
  { country_fr: 'Paraguay', currency_fr: 'Guarani', code: 'PYG' },
  { country_fr: 'Bolivie', currency_fr: 'Boliviano', code: 'BOB' },
  { country_fr: 'Venezuela', currency_fr: 'Bolivar', code: 'VES' },
  { country_fr: 'Royaume-Uni', currency_fr: 'Livre sterling', code: 'GBP' },
  { country_fr: 'Suisse', currency_fr: 'Franc suisse', code: 'CHF' },
  { country_fr: 'Norvège', currency_fr: 'Couronne norvégienne', code: 'NOK' },
  { country_fr: 'Suède', currency_fr: 'Couronne suédoise', code: 'SEK' },
  { country_fr: 'Danemark', currency_fr: 'Couronne danoise', code: 'DKK' },
  { country_fr: 'Pologne', currency_fr: 'Zloty', code: 'PLN' },
  { country_fr: 'Tchéquie', currency_fr: 'Couronne tchèque', code: 'CZK' },
  { country_fr: 'Hongrie', currency_fr: 'Forint', code: 'HUF' },
  { country_fr: 'Roumanie', currency_fr: 'Leu roumain', code: 'RON' },
  { country_fr: 'Bulgarie', currency_fr: 'Lev', code: 'BGN' },
  { country_fr: 'Serbie', currency_fr: 'Dinar serbe', code: 'RSD' },
  { country_fr: 'Turquie', currency_fr: 'Livre turque', code: 'TRY' },
  { country_fr: 'Russie', currency_fr: 'Rouble russe', code: 'RUB' },
  { country_fr: 'Ukraine', currency_fr: 'Hryvnia', code: 'UAH' },
  { country_fr: 'Maroc', currency_fr: 'Dirham marocain', code: 'MAD' },
  { country_fr: 'Algérie', currency_fr: 'Dinar algérien', code: 'DZD' },
  { country_fr: 'Tunisie', currency_fr: 'Dinar tunisien', code: 'TND' },
  { country_fr: 'Égypte', currency_fr: 'Livre égyptienne', code: 'EGP' },
  { country_fr: 'Afrique du Sud', currency_fr: 'Rand', code: 'ZAR' },
  { country_fr: 'Nigeria', currency_fr: 'Naira', code: 'NGN' },
  { country_fr: 'Ghana', currency_fr: 'Cedi', code: 'GHS' },
  { country_fr: 'Kenya', currency_fr: 'Shilling kenyan', code: 'KES' },
  { country_fr: 'Éthiopie', currency_fr: 'Birr', code: 'ETB' },
  { country_fr: 'Tanzanie', currency_fr: 'Shilling tanzanien', code: 'TZS' },
  { country_fr: 'Ouganda', currency_fr: 'Shilling ougandais', code: 'UGX' },
  { country_fr: 'Arabie saoudite', currency_fr: 'Riyal saoudien', code: 'SAR' },
  { country_fr: 'Émirats arabes unis', currency_fr: 'Dirham des EAU', code: 'AED' },
  { country_fr: 'Qatar', currency_fr: 'Riyal qatari', code: 'QAR' },
  { country_fr: 'Koweït', currency_fr: 'Dinar koweïtien', code: 'KWD' },
  { country_fr: 'Bahreïn', currency_fr: 'Dinar bahreïni', code: 'BHD' },
  { country_fr: 'Oman', currency_fr: 'Rial omanais', code: 'OMR' },
  { country_fr: 'Israël', currency_fr: 'Shekel', code: 'ILS' },
  { country_fr: 'Inde', currency_fr: 'Roupie indienne', code: 'INR' },
  { country_fr: 'Pakistan', currency_fr: 'Roupie pakistanaise', code: 'PKR' },
  { country_fr: 'Bangladesh', currency_fr: 'Taka', code: 'BDT' },
  { country_fr: 'Sri Lanka', currency_fr: 'Roupie srilankaise', code: 'LKR' },
  { country_fr: 'Népal', currency_fr: 'Roupie népalaise', code: 'NPR' },
  { country_fr: 'Chine', currency_fr: 'Yuan renminbi', code: 'CNY' },
  { country_fr: 'Japon', currency_fr: 'Yen', code: 'JPY' },
  { country_fr: 'Corée du Sud', currency_fr: 'Won sud-coréen', code: 'KRW' },
  { country_fr: 'Taïwan', currency_fr: 'Nouveau dollar de Taïwan', code: 'TWD' },
  { country_fr: 'Hong Kong', currency_fr: 'Dollar de Hong Kong', code: 'HKD' },
  { country_fr: 'Singapour', currency_fr: 'Dollar de Singapour', code: 'SGD' },
  { country_fr: 'Malaisie', currency_fr: 'Ringgit', code: 'MYR' },
  { country_fr: 'Indonésie', currency_fr: 'Roupie indonésienne', code: 'IDR' },
  { country_fr: 'Thaïlande', currency_fr: 'Baht', code: 'THB' },
  { country_fr: 'Vietnam', currency_fr: 'Dong', code: 'VND' },
  { country_fr: 'Philippines', currency_fr: 'Peso philippin', code: 'PHP' },
  { country_fr: 'Australie', currency_fr: 'Dollar australien', code: 'AUD' },
  { country_fr: 'Nouvelle-Zélande', currency_fr: 'Dollar néo-zélandais', code: 'NZD' },
  { country_fr: 'Papouasie-Nouvelle-Guinée', currency_fr: 'Kina', code: 'PGK' },
  { country_fr: 'Fidji', currency_fr: 'Dollar fidjien', code: 'FJD' },
  { country_fr: 'Kazakhstan', currency_fr: 'Tenge', code: 'KZT' },
  { country_fr: 'Ouzbékistan', currency_fr: 'Soum', code: 'UZS' },
  { country_fr: 'Azerbaïdjan', currency_fr: 'Manat', code: 'AZN' },
  { country_fr: 'Géorgie', currency_fr: 'Lari', code: 'GEL' },
  { country_fr: 'Arménie', currency_fr: 'Dram arménien', code: 'AMD' }
]

export async function seedWorldCurrenciesPack(): Promise<{
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

  const packSlug = 'monnaies-du-monde'
  const now = new Date().toISOString()
  const tags = ['Géographie/Économie']

  const { error: packErr } = await supabase.from('packs').upsert(
    [
      {
        id: packId(packSlug),
        slug: packSlug,
        title: 'Monnaies du monde (par pays)',
        description: 'Retrouver la monnaie officielle du pays.',
        tags,
        created_at: now,
        updated_at: now
      }
    ],
    { onConflict: 'slug' }
  )
  if (packErr) throw new Error(`packs upsert failed (${packSlug}): ${packErr.message}`)

  const cards = CARDS.slice().sort((a, b) => a.country_fr.localeCompare(b.country_fr))
  const keepIds = new Set<string>()
  const payload = cards.map((entry) => {
    const id = cardId(packSlug, entry.country_fr)
    keepIds.add(id)
    return {
      id,
      pack_slug: packSlug,
      front_md: `Monnaie du pays: ${entry.country_fr}`,
      back_md: `${entry.currency_fr} (${entry.code})`,
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
  const res = await seedWorldCurrenciesPack()
  console.log(`pack_slug=${res.pack_slug} cards_upserted=${res.cards_upserted} cards_deleted=${res.cards_deleted}`)
}

