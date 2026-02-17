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

type WorkDef = {
  key: string
  work: string
  author: string
}

const WORKS: WorkDef[] = [
  { key: 'iliade', work: "L'Iliade", author: 'Homere' },
  { key: 'odyssee', work: "L'Odyssee", author: 'Homere' },
  { key: 'eneide', work: "L'Eneide", author: 'Virgile' },
  { key: 'don-quichotte', work: 'Don Quichotte', author: 'Miguel de Cervantes' },
  { key: 'hamlet', work: 'Hamlet', author: 'William Shakespeare' },
  { key: 'romeo-juliette', work: 'Romeo et Juliette', author: 'William Shakespeare' },
  { key: 'macbeth', work: 'Macbeth', author: 'William Shakespeare' },
  { key: 'misanthrope', work: 'Le Misanthrope', author: 'Moliere' },
  { key: 'tartuffe', work: 'Tartuffe', author: 'Moliere' },
  { key: 'candide', work: 'Candide', author: 'Voltaire' },
  { key: 'rouge-noir', work: 'Le Rouge et le Noir', author: 'Stendhal' },
  { key: 'trois-mousquetaires', work: 'Les Trois Mousquetaires', author: 'Alexandre Dumas' },
  { key: 'monte-cristo', work: 'Le Comte de Monte-Cristo', author: 'Alexandre Dumas' },
  { key: 'fleurs-du-mal', work: 'Les Fleurs du mal', author: 'Charles Baudelaire' },
  { key: 'madame-bovary', work: 'Madame Bovary', author: 'Gustave Flaubert' },
  { key: 'bel-ami', work: 'Bel-Ami', author: 'Guy de Maupassant' },
  { key: 'germinal', work: 'Germinal', author: 'Emile Zola' },
  { key: 'crime-chatiment', work: 'Crime et chatiment', author: 'Fiodor Dostoievski' },
  { key: 'guerre-paix', work: 'Guerre et Paix', author: 'Leon Tolstoi' },
  { key: 'anna-karenine', work: 'Anna Karenine', author: 'Leon Tolstoi' },
  { key: 'frankenstein', work: 'Frankenstein', author: 'Mary Shelley' },
  { key: 'orgueil-prejuges', work: 'Orgueil et Prejuges', author: 'Jane Austen' },
  { key: 'jane-eyre', work: 'Jane Eyre', author: 'Charlotte Bronte' },
  { key: 'moby-dick', work: 'Moby-Dick', author: 'Herman Melville' },
  { key: 'proces', work: 'Le Proces', author: 'Franz Kafka' },
  { key: 'ulysse', work: 'Ulysse', author: 'James Joyce' },
  { key: 'etranger', work: "L'Etranger", author: 'Albert Camus' },
  { key: 'peste', work: 'La Peste', author: 'Albert Camus' },
  { key: '1984', work: '1984', author: 'George Orwell' },
  { key: 'ferme-animaux', work: 'La Ferme des animaux', author: 'George Orwell' },
  { key: 'petit-prince', work: 'Le Petit Prince', author: 'Antoine de Saint-Exupery' },
  { key: 'miserables', work: 'Les Miserables', author: 'Victor Hugo' },
  { key: 'notre-dame-paris', work: 'Notre-Dame de Paris', author: 'Victor Hugo' },
  { key: 'recherche-temps-perdu', work: 'A la recherche du temps perdu', author: 'Marcel Proust' },
  { key: 'seigneur-anneaux', work: 'Le Seigneur des anneaux', author: 'J. R. R. Tolkien' }
]

export async function seedClassicAuthorsWorksPack(): Promise<{
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

  const packSlug = 'auteurs-oeuvres-classiques'
  const now = new Date().toISOString()
  const tags = ['Culture/Litterature']

  const { error: packErr } = await supabase.from('packs').upsert(
    [
      {
        id: packId(packSlug),
        slug: packSlug,
        title: 'Auteurs et oeuvres classiques',
        description: "Identifier l'auteur d'une oeuvre litteraire classique.",
        tags,
        created_at: now,
        updated_at: now
      }
    ],
    { onConflict: 'slug' }
  )
  if (packErr) throw new Error(`packs upsert failed (${packSlug}): ${packErr.message}`)

  const keepIds = new Set<string>()
  const cards = WORKS.map((entry) => {
    const id = cardId(packSlug, entry.key)
    keepIds.add(id)
    return {
      id,
      pack_slug: packSlug,
      front_md: `Qui a ecrit "${entry.work}" ?`,
      back_md: entry.author,
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
  const res = await seedClassicAuthorsWorksPack()
  console.log(`pack_slug=${res.pack_slug} cards_upserted=${res.cards_upserted} cards_deleted=${res.cards_deleted}`)
}
