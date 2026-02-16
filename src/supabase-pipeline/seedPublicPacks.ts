import { readFile, readdir } from 'node:fs/promises'
import { join, basename } from 'node:path'
import './env.js'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { v5 as uuidv5 } from 'uuid'
import { isMainModule } from './isMain.js'
import { assertServiceRoleKeyMatchesUrl } from './supabaseAuth.js'
import { assertDestructiveOperationAllowed } from './destructive.js'

type PackFile = {
  version: number
  exported_at?: string
  cards: Array<{
    front_md?: string
    back_md?: string
    hint_md?: string
    tags?: string[]
  }>
}

const NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8' // UUID namespace (DNS)

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

function titleFromFilename(fileBase: string): string {
  return fileBase.replace(/_/g, ' ').replace(/-/g, ' ').trim()
}

function uniqueSorted(xs: string[]): string[] {
  return Array.from(new Set(xs.map((s) => s.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

function cardDeterministicId(packSlug: string, front: string, back: string, tags: string[]): string {
  const key = `card:${packSlug}:${front}\n---\n${back}\n---\n${tags.join('|')}`
  return uuidv5(key, NAMESPACE)
}

function packDeterministicId(packSlug: string): string {
  return uuidv5(`pack:${packSlug}`, NAMESPACE)
}

async function listPackFiles(): Promise<string[]> {
  const dir = join(process.cwd(), 'packs')
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort()
  return files.map((f) => join(dir, f))
}

async function deleteCardsNotInSet(supabase: SupabaseClient, packSlug: string, keepIds: Set<string>) {
  // Paginate through existing IDs for the pack and delete those not in keepIds.
  const pageSize = 1000
  let offset = 0
  const toDelete: string[] = []

  while (true) {
    const { data, error } = await supabase
      .from('public_cards')
      .select('id')
      .eq('pack_slug', packSlug)
      .range(offset, offset + pageSize - 1)
    if (error) throw new Error(`list public_cards failed: ${error.message}`)
    const ids = (data ?? []).map((r: { id: string }) => r.id)
    if (ids.length === 0) break

    for (const id of ids) {
      if (!keepIds.has(id)) toDelete.push(id)
    }

    if (ids.length < pageSize) break
    offset += pageSize
  }

  if (toDelete.length === 0) return 0

  assertDestructiveOperationAllowed('delete stale pack cards')

  const chunkSize = 200
  let deleted = 0
  for (let i = 0; i < toDelete.length; i += chunkSize) {
    const chunk = toDelete.slice(i, i + chunkSize)
    const { error } = await supabase.from('public_cards').delete().in('id', chunk)
    if (error) throw new Error(`delete public_cards failed: ${error.message}`)
    deleted += chunk.length
  }
  return deleted
}

export async function seedPublicPacks(): Promise<{
  packs_upserted: number
  cards_upserted: number
  cards_deleted: number
}> {
  const supabaseUrl = requireEnv('SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  assertServiceRoleKeyMatchesUrl(supabaseUrl, serviceKey)

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const paths = await listPackFiles()

  let packsUpserted = 0
  let cardsUpserted = 0
  let cardsDeleted = 0

  for (const path of paths) {
    const fileBase = basename(path, '.json')
    const packSlug = slugify(fileBase)
    const raw = JSON.parse(await readFile(path, 'utf8')) as PackFile

    if (!raw || raw.version !== 1 || !Array.isArray(raw.cards)) {
      throw new Error(`Invalid pack format: ${path}`)
    }

    const exportedAt = typeof raw.exported_at === 'string' ? raw.exported_at : new Date().toISOString()

    const cards = raw.cards
      .map((c) => ({
        front_md: (c.front_md ?? '').trim(),
        back_md: (c.back_md ?? '').trim(),
        tags: uniqueSorted(Array.isArray(c.tags) ? c.tags : [])
      }))
      .filter((c) => c.front_md && c.back_md)

    const packTags = uniqueSorted(cards.flatMap((c) => c.tags))
    const title = titleFromFilename(fileBase)

    const packRow = {
      id: packDeterministicId(packSlug),
      slug: packSlug,
      title,
      description: null as string | null,
      tags: packTags,
      created_at: exportedAt,
      updated_at: exportedAt
    }

    const { error: packErr } = await supabase.from('packs').upsert([packRow], { onConflict: 'slug' })
    if (packErr) throw new Error(`packs upsert failed (${packSlug}): ${packErr.message}`)
    packsUpserted++

    const keepIds = new Set<string>()
    const cardRows = cards.map((c) => {
      const id = cardDeterministicId(packSlug, c.front_md, c.back_md, c.tags)
      keepIds.add(id)
      return {
        id,
        pack_slug: packSlug,
        front_md: c.front_md,
        back_md: c.back_md,
        tags: c.tags,
        created_at: exportedAt,
        updated_at: exportedAt
      }
    })

    // Upsert in chunks.
    const chunkSize = 500
    for (let i = 0; i < cardRows.length; i += chunkSize) {
      const chunk = cardRows.slice(i, i + chunkSize)
      const { error } = await supabase.from('public_cards').upsert(chunk, { onConflict: 'id' })
      if (error) throw new Error(`public_cards upsert failed (${packSlug} chunk ${i}): ${error.message}`)
      cardsUpserted += chunk.length
    }

    cardsDeleted += await deleteCardsNotInSet(supabase, packSlug, keepIds)
  }

  return { packs_upserted: packsUpserted, cards_upserted: cardsUpserted, cards_deleted: cardsDeleted }
}

if (isMainModule(import.meta.url)) {
  const res = await seedPublicPacks()
  console.log(`packs_upserted=${res.packs_upserted} cards_upserted=${res.cards_upserted} cards_deleted=${res.cards_deleted}`)
}
