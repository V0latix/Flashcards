import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import './env.js'
import pLimit from 'p-limit'
import { createClient } from '@supabase/supabase-js'
import { OUT_SVG_DIR } from './paths.js'
import { isMainModule } from './isMain.js'

const BUCKET = 'france-departements-maps'
const CONCURRENCY = 6

function requireEnv(name: string): string {
  const v = process.env[name]
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s) throw new Error(`Missing ${name} in environment`)
  return s
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastError: unknown = null
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      await sleep(250 * Math.pow(2, i))
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export async function uploadAllDepartementSvgs(): Promise<{ uploaded: number }> {
  const supabaseUrl = requireEnv('SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const bucketsRes = await supabase.storage.listBuckets()
  if (bucketsRes.error) throw new Error(`listBuckets failed: ${bucketsRes.error.message}`)

  const bucketExists = (bucketsRes.data ?? []).some((b) => b.name === BUCKET)
  if (!bucketExists) {
    const createRes = await supabase.storage.createBucket(BUCKET, { public: true })
    if (createRes.error) throw new Error(`createBucket(${BUCKET}) failed: ${createRes.error.message}`)
  }

  const files = (await readdir(OUT_SVG_DIR)).filter((f) => f.endsWith('.svg')).sort()
  const limit = pLimit(CONCURRENCY)
  let uploaded = 0

  await Promise.all(
    files.map((file) =>
      limit(async () => {
        const code = file.replace(/\.svg$/i, '').toUpperCase()
        const path = `svg/${code}.svg`
        const body = await readFile(join(OUT_SVG_DIR, file))

        await withRetry(async () => {
          const res = await supabase.storage.from(BUCKET).upload(path, new Blob([body], { type: 'image/svg+xml' }), {
            upsert: true,
            contentType: 'image/svg+xml',
            cacheControl: '300'
          })
          if (res.error) throw new Error(`upload ${path} failed: ${res.error.message}`)
        }, 5)

        uploaded += 1
        if (uploaded % 20 === 0) {
          console.log(`[upload departements] ${uploaded}/${files.length}`)
        }
      })
    )
  )

  return { uploaded }
}

if (isMainModule(import.meta.url)) {
  const res = await uploadAllDepartementSvgs()
  console.log(`Uploaded departement SVGs: ${res.uploaded}`)
}
