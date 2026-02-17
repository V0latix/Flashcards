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

type CardDef = {
  key: string
  front: string
  back: string
}

const CARDS: CardDef[] = [
  {
    key: 'republique-1-sans-president',
    front: 'Y a-t-il un president de la France sous la Ire Republique (1792-1804) ?',
    back: "Non. La Ire Republique n'a pas de president de la Republique au sens actuel."
  },
  {
    key: 'louis-napoleon-bonaparte',
    front: 'De quelle Republique francaise Louis-Napoleon Bonaparte est-il president ?',
    back: 'IIe Republique (1848-1852)'
  },
  {
    key: 'adolphe-thiers',
    front: 'De quelle Republique francaise Adolphe Thiers est-il president ?',
    back: 'IIIe Republique (1871-1873)'
  },
  {
    key: 'patrice-de-mac-mahon',
    front: 'De quelle Republique francaise Patrice de Mac Mahon est-il president ?',
    back: 'IIIe Republique (1873-1879)'
  },
  {
    key: 'jules-grevy',
    front: 'De quelle Republique francaise Jules Grevy est-il president ?',
    back: 'IIIe Republique (1879-1887)'
  },
  {
    key: 'sadi-carnot',
    front: 'De quelle Republique francaise Sadi Carnot est-il president ?',
    back: 'IIIe Republique (1887-1894)'
  },
  {
    key: 'jean-casimir-perier',
    front: 'De quelle Republique francaise Jean Casimir-Perier est-il president ?',
    back: 'IIIe Republique (1894-1895)'
  },
  {
    key: 'felix-faure',
    front: 'De quelle Republique francaise Felix Faure est-il president ?',
    back: 'IIIe Republique (1895-1899)'
  },
  {
    key: 'emile-loubet',
    front: 'De quelle Republique francaise Emile Loubet est-il president ?',
    back: 'IIIe Republique (1899-1906)'
  },
  {
    key: 'armand-fallieres',
    front: 'De quelle Republique francaise Armand Fallieres est-il president ?',
    back: 'IIIe Republique (1906-1913)'
  },
  {
    key: 'raymond-poincare',
    front: 'De quelle Republique francaise Raymond Poincare est-il president ?',
    back: 'IIIe Republique (1913-1920)'
  },
  {
    key: 'paul-deschanel',
    front: 'De quelle Republique francaise Paul Deschanel est-il president ?',
    back: 'IIIe Republique (1920)'
  },
  {
    key: 'alexandre-millerand',
    front: 'De quelle Republique francaise Alexandre Millerand est-il president ?',
    back: 'IIIe Republique (1920-1924)'
  },
  {
    key: 'gaston-doumergue',
    front: 'De quelle Republique francaise Gaston Doumergue est-il president ?',
    back: 'IIIe Republique (1924-1931)'
  },
  {
    key: 'paul-doumer',
    front: 'De quelle Republique francaise Paul Doumer est-il president ?',
    back: 'IIIe Republique (1931-1932)'
  },
  {
    key: 'albert-lebrun',
    front: 'De quelle Republique francaise Albert Lebrun est-il president ?',
    back: 'IIIe Republique (1932-1940)'
  },
  {
    key: 'vincent-auriol',
    front: 'De quelle Republique francaise Vincent Auriol est-il president ?',
    back: 'IVe Republique (1947-1954)'
  },
  {
    key: 'rene-coty',
    front: 'De quelle Republique francaise Rene Coty est-il president ?',
    back: 'IVe Republique (1954-1959)'
  },
  {
    key: 'charles-de-gaulle',
    front: 'De quelle Republique francaise Charles de Gaulle est-il president ?',
    back: 'Ve Republique (1959-1969)'
  },
  {
    key: 'georges-pompidou',
    front: 'De quelle Republique francaise Georges Pompidou est-il president ?',
    back: 'Ve Republique (1969-1974)'
  },
  {
    key: 'valery-giscard-destaing',
    front: "De quelle Republique francaise Valery Giscard d'Estaing est-il president ?",
    back: 'Ve Republique (1974-1981)'
  },
  {
    key: 'francois-mitterrand',
    front: 'De quelle Republique francaise Francois Mitterrand est-il president ?',
    back: 'Ve Republique (1981-1995)'
  },
  {
    key: 'jacques-chirac',
    front: 'De quelle Republique francaise Jacques Chirac est-il president ?',
    back: 'Ve Republique (1995-2007)'
  },
  {
    key: 'nicolas-sarkozy',
    front: 'De quelle Republique francaise Nicolas Sarkozy est-il president ?',
    back: 'Ve Republique (2007-2012)'
  },
  {
    key: 'francois-hollande',
    front: 'De quelle Republique francaise Francois Hollande est-il president ?',
    back: 'Ve Republique (2012-2017)'
  },
  {
    key: 'emmanuel-macron',
    front: 'De quelle Republique francaise Emmanuel Macron est-il president ?',
    back: 'Ve Republique (2017-present)'
  }
]

export async function seedFrenchRepublicPresidentsPack(): Promise<{
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

  const packSlug = 'presidents-republiques-francaises'
  const now = new Date().toISOString()
  const tags = ['Histoire/France/Politique']

  const { error: packErr } = await supabase.from('packs').upsert(
    [
      {
        id: packId(packSlug),
        slug: packSlug,
        title: 'Presidents des Republiques francaises',
        description: 'Presidents de la France de la IIe a la Ve Republique (avec indication de la Republique).',
        tags,
        created_at: now,
        updated_at: now
      }
    ],
    { onConflict: 'slug' }
  )
  if (packErr) throw new Error(`packs upsert failed (${packSlug}): ${packErr.message}`)

  const keepIds = new Set<string>()
  const cards = CARDS.map((entry) => {
    const id = cardId(packSlug, entry.key)
    keepIds.add(id)
    return {
      id,
      pack_slug: packSlug,
      front_md: entry.front,
      back_md: entry.back,
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
  const res = await seedFrenchRepublicPresidentsPack()
  console.log(`pack_slug=${res.pack_slug} cards_upserted=${res.cards_upserted} cards_deleted=${res.cards_deleted}`)
}
