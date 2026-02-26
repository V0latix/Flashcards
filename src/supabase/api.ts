import { supabase } from './client'
import type { Pack, PublicCard } from './types'

const PAGE_SIZE = 1000
const PUBLIC_CARD_COUNTS_RPC = 'public_card_counts_by_pack'

export async function listPacks(): Promise<Pack[]> {
  const { data, error } = await supabase
    .from('packs')
    .select('id, slug, title, description, tags')
    .order('title', { ascending: true })

  if (error) {
    throw new Error(`Supabase listPacks failed: ${error.message}`)
  }

  return (data ?? []) as Pack[]
}

type PublicCardCountRow = {
  pack_slug: string | null
  cards_count: number | string | null
}

const parseCountRows = (rows: PublicCardCountRow[]): Record<string, number> => {
  const counts: Record<string, number> = {}
  rows.forEach((row) => {
    if (typeof row.pack_slug !== 'string' || row.pack_slug.trim() === '') {
      return
    }
    const parsed =
      typeof row.cards_count === 'number'
        ? row.cards_count
        : Number(row.cards_count ?? 0)
    counts[row.pack_slug] = Number.isFinite(parsed) ? parsed : 0
  })
  return counts
}

const listPublicCardCountsByPackSlugLegacy = async (): Promise<Record<string, number>> => {
  const counts: Record<string, number> = {}
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('public_cards')
      .select('id, pack_slug')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw new Error(`Supabase listPublicCardCountsByPackSlug failed: ${error.message}`)
    }

    const chunk = (data ?? []) as Array<Pick<PublicCard, 'id' | 'pack_slug'>>
    chunk.forEach((row) => {
      counts[row.pack_slug] = (counts[row.pack_slug] ?? 0) + 1
    })

    if (chunk.length < PAGE_SIZE) {
      break
    }
    from += PAGE_SIZE
  }

  return counts
}

const isMissingRpcError = (error: { code?: string; message?: string }) => {
  const message = (error.message ?? '').toLowerCase()
  return (
    error.code === 'PGRST202' ||
    message.includes('could not find the function') ||
    message.includes(PUBLIC_CARD_COUNTS_RPC)
  )
}

export async function listPublicCardCountsByPackSlug(): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc(PUBLIC_CARD_COUNTS_RPC)

  if (!error) {
    return parseCountRows((data ?? []) as PublicCardCountRow[])
  }

  if (isMissingRpcError(error)) {
    return listPublicCardCountsByPackSlugLegacy()
  }

  throw new Error(`Supabase listPublicCardCountsByPackSlug failed: ${error.message}`)
}

export async function listPublicCardsByPackSlug(slug: string): Promise<PublicCard[]> {
  const rows: PublicCard[] = []
  let from = 0

  // Page through rows to avoid the default API cap (often 1000 rows/request).
  while (true) {
    const { data, error } = await supabase
      .from('public_cards')
      .select('id, pack_slug, front_md, back_md, tags')
      .eq('pack_slug', slug)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw new Error(`Supabase listPublicCardsByPackSlug failed: ${error.message}`)
    }

    const chunk = (data ?? []) as PublicCard[]
    rows.push(...chunk)

    if (chunk.length < PAGE_SIZE) {
      break
    }
    from += PAGE_SIZE
  }

  return rows
}
