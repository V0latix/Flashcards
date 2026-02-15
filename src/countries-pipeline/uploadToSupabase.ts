import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import './env.js'
import pLimit from 'p-limit'
import { createClient } from '@supabase/supabase-js'
import { OUT_SVG_BLUE_DIR, OUT_SVG_DIR } from './paths.js'
import { isMainModule } from './isMain.js'
import { assertServiceRoleKeyMatchesUrl } from './supabaseAuth.js'

const BUCKET = 'country-maps'
const PREFIX = 'svg'
// Storage uploads can sometimes take a while (TLS + network + Supabase edge).
// Keep this high to avoid aborting valid uploads; retries handle true stalls.
const FETCH_TIMEOUT_MS = 120_000

function requireEnv(name: string): string {
  const v = process.env[name]
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s) throw new Error(`Missing ${name} in environment`)
  return s
}

function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
): ReturnType<typeof fetch> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(t))
}

function publicUrlFor(supabaseUrl: string, path: string): string {
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${path}`
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms))
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: unknown = null
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      // Exponential backoff + tiny jitter helps with transient network/TLS hiccups.
      const jitter = Math.floor(Math.random() * 75)
      await sleep(350 * Math.pow(2, i) + jitter)
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

async function cleanupBadFilenames(supabase: any, prefix: string) {
  // Bug compatibility: earlier versions uploaded `AE.SVG.svg` instead of `AE.svg`.
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    limit: 1000,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' }
  })
  if (error) throw new Error(`list(${prefix}) failed: ${error.message}`)

  const bad = (data ?? [])
    .map((o: { name: string }) => o.name)
    .filter((name: string) => /^[A-Z]{2}\.SVG\.svg$/.test(name))
    .map((name: string) => `${prefix}/${name}`)

  if (bad.length === 0) return

  const { error: rmErr } = await supabase.storage.from(BUCKET).remove(bad)
  if (rmErr) throw new Error(`cleanup remove failed: ${rmErr.message}`)
}

async function uploadDir(supabase: any, supabaseUrl: string, localDir: string, remotePrefix: string) {
  await cleanupBadFilenames(supabase, remotePrefix)

  const files = (await readdir(localDir)).filter((f) => f.endsWith('.svg'))
  // Supabase Storage uploads can be flaky with too much concurrency.
  const limit = pLimit(4)

  const urls: Record<string, string> = {}
  let uploaded = 0

  await Promise.all(
    files.map((file) =>
      limit(async () => {
        const iso2 = file.replace(/\.svg$/, '').toUpperCase()
        const body = await readFile(join(localDir, file))
        const path = `${remotePrefix}/${iso2}.svg`

        await withRetry(async () => {
          const { error } = await supabase.storage
            .from(BUCKET)
            .upload(path, new Blob([body], { type: 'image/svg+xml' }), {
              upsert: true,
              contentType: 'image/svg+xml',
              // Iterate faster; CDN caching can otherwise hide updates for a while.
              cacheControl: '300'
            })
          if (error) throw new Error(`upload ${path} failed: ${error.message}`)
        }, 5)

        urls[iso2] = publicUrlFor(supabaseUrl, path)
        uploaded++
        if (uploaded % 25 === 0) {
          console.log(`[upload ${remotePrefix}] ${uploaded}/${files.length}`)
        }
      })
    )
  )

  return { uploaded, urls }
}

export async function uploadAllCountrySvgs(): Promise<{
  uploaded_base: number
  uploaded_blue: number
  urls_base: Record<string, string>
  urls_blue: Record<string, string>
}> {
  const supabaseUrl = requireEnv('SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

  assertServiceRoleKeyMatchesUrl(supabaseUrl, serviceKey)

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithTimeout }
  })

  const buckets = await withRetry(async () => {
    const { data, error } = await supabase.storage.listBuckets()
    if (error) throw new Error(`listBuckets failed: ${error.message}`)
    return data ?? []
  }, 5)

  const exists = buckets.some((b: { name: string }) => b.name === BUCKET)
  if (!exists) {
    await withRetry(async () => {
      const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
      if (error) throw new Error(`createBucket(${BUCKET}) failed: ${error.message}`)
    }, 5)
  }

  const base = await uploadDir(supabase, supabaseUrl, OUT_SVG_DIR, 'svg')
  const blue = await uploadDir(supabase, supabaseUrl, OUT_SVG_BLUE_DIR, 'svg-blue')

  return {
    uploaded_base: base.uploaded,
    uploaded_blue: blue.uploaded,
    urls_base: base.urls,
    urls_blue: blue.urls
  }
}

if (isMainModule(import.meta.url)) {
  const res = await uploadAllCountrySvgs()
  console.log(`Uploaded base: ${res.uploaded_base}, blue: ${res.uploaded_blue}`)
  console.log(`Example URL: ${Object.values(res.urls_base)[0] ?? '(none)'}`)
}
