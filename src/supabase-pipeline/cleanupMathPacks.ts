import './env.js'
import { createClient } from '@supabase/supabase-js'
import { isMainModule } from './isMain.js'
import { assertServiceRoleKeyMatchesUrl } from './supabaseAuth.js'
import { assertDestructiveOperationAllowed } from './destructive.js'

function requireEnv(name: string): string {
  const v = process.env[name]
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s) throw new Error(`Missing ${name} in environment`)
  return s
}

const MATH_PACK_SLUGS = [
  'chap1-logiqueetraisonnement',
  'chap2-ensembleapplicationrelation',
  'chap2-v2'
]

export async function cleanupMathPacks(): Promise<{ cards_deleted: number; packs_deleted: number }> {
  const supabaseUrl = requireEnv('SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  assertServiceRoleKeyMatchesUrl(supabaseUrl, serviceKey)

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  assertDestructiveOperationAllowed('delete math packs and cards', `pack_slugs=${MATH_PACK_SLUGS.join(',')}`)

  // Delete cards for those packs.
  const { error: delCardsErr, count: cardsDeleted } = await supabase
    .from('public_cards')
    .delete({ count: 'exact' })
    .in('pack_slug', MATH_PACK_SLUGS)

  if (delCardsErr) {
    throw new Error(`public_cards delete failed: ${delCardsErr.message}`)
  }

  // Delete packs themselves to avoid empty entries in the UI.
  const { error: delPacksErr, count: packsDeleted } = await supabase
    .from('packs')
    .delete({ count: 'exact' })
    .in('slug', MATH_PACK_SLUGS)

  if (delPacksErr) {
    throw new Error(`packs delete failed: ${delPacksErr.message}`)
  }

  return { cards_deleted: cardsDeleted ?? 0, packs_deleted: packsDeleted ?? 0 }
}

if (isMainModule(import.meta.url)) {
  const res = await cleanupMathPacks()
  console.log(`cards_deleted=${res.cards_deleted} packs_deleted=${res.packs_deleted}`)
}
