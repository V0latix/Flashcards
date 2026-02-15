import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import './env.js'
import { createClient } from '@supabase/supabase-js'
import { v5 as uuidv5 } from 'uuid'
import { isMainModule } from './isMain.js'
import { assertServiceRoleKeyMatchesUrl } from './supabaseAuth.js'

type PackFile = {
  version: number
  cards: Array<{
    front_md?: string
    back_md?: string
    tags?: string[]
  }>
}

const NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'

function requireEnv(name: string): string {
  const v = process.env[name]
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s) throw new Error(`Missing ${name} in environment`)
  return s
}

function slugify(input: string): string {
  const ascii = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  return ascii
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function uniqueSorted(xs: string[]): string[] {
  return Array.from(new Set(xs.map((s) => s.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

function cardDeterministicId(packSlug: string, front: string, back: string, tags: string[]): string {
  const key = `card:${packSlug}:${front}\n---\n${back}\n---\n${tags.join('|')}`
  return uuidv5(key, NAMESPACE)
}

const MATH_PACK_FILES = [
  join(process.cwd(), 'packs', 'Chap1_LogiqueEtRaisonnement.json'),
  join(process.cwd(), 'packs', 'Chap2_V2.json'),
  join(process.cwd(), 'packs', 'Chap2_EnsembleApplicationRelation.json')
]

async function deleteByIds(supabase: any, ids: string[]): Promise<number> {
  const chunkSize = 200
  let deleted = 0
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize)
    const { error, count } = await supabase.from('public_cards').delete({ count: 'exact' }).in('id', chunk)
    if (error) throw new Error(`delete public_cards by id failed: ${error.message}`)
    deleted += count ?? 0
  }
  return deleted
}

export async function cleanupMathSeed(): Promise<{ ids_targeted: number; cards_deleted: number }> {
  const supabaseUrl = requireEnv('SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  assertServiceRoleKeyMatchesUrl(supabaseUrl, serviceKey)

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const ids: string[] = []
  for (const path of MATH_PACK_FILES) {
    const raw = JSON.parse(await readFile(path, 'utf8')) as PackFile
    if (!raw || raw.version !== 1 || !Array.isArray(raw.cards)) continue
    const packSlug = slugify(path.split('/').pop()!.replace(/\.json$/, ''))

    for (const c of raw.cards) {
      const front = (c.front_md ?? '').trim()
      const back = (c.back_md ?? '').trim()
      const tags = uniqueSorted(Array.isArray(c.tags) ? c.tags : [])
      if (!front || !back) continue
      ids.push(cardDeterministicId(packSlug, front, back, tags))
    }
  }

  const cardsDeleted = await deleteByIds(supabase, ids)
  return { ids_targeted: ids.length, cards_deleted: cardsDeleted }
}

if (isMainModule(import.meta.url)) {
  const res = await cleanupMathSeed()
  console.log(`ids_targeted=${res.ids_targeted} cards_deleted=${res.cards_deleted}`)
}

