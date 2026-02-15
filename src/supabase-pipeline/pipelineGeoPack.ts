import { cleanupMathPacks } from './cleanupMathPacks.js'
import { seedCountriesLocationPack } from './seedCountriesLocationPack.js'
import { isMainModule } from './isMain.js'
import './env.js'

export async function pipelineGeoPack() {
  const cleanup = await cleanupMathPacks()
  const seed = await seedCountriesLocationPack()

  console.log('--- Geo Pack Pipeline ---')
  console.log(`math_cards_deleted: ${cleanup.cards_deleted}`)
  console.log(`math_packs_deleted: ${cleanup.packs_deleted}`)
  console.log(`new_pack_slug: ${seed.pack_slug}`)
  console.log(`cards_upserted: ${seed.cards_upserted}`)
  console.log(`cards_deleted_in_pack: ${seed.cards_deleted}`)
}

if (isMainModule(import.meta.url)) {
  await pipelineGeoPack()
}

