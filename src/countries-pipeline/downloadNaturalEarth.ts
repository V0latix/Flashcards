import { createWriteStream } from 'node:fs'
import { mkdir, stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import AdmZip from 'adm-zip'
import { ensureDirs, listFilesRecursive, NE110_EXTRACT_DIR, NE110_ZIP, NE50_EXTRACT_DIR, NE50_ZIP } from './paths.js'

type NEScale = '50m' | '110m'

const URLS: Record<NEScale, string> = {
  '110m': 'https://naturalearth.s3.amazonaws.com/110m_cultural/ne_110m_admin_0_countries.zip',
  '50m': 'https://naturalearth.s3.amazonaws.com/50m_cultural/ne_50m_admin_0_countries.zip'
}

function getScaleFromEnv(): NEScale {
  const v = (process.env.COUNTRIES_NE_SCALE ?? '').trim().toLowerCase()
  if (v === '110m') return '110m'
  if (v === '50m') return '50m'
  return '50m'
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

export async function downloadNaturalEarthAdmin0Countries(): Promise<{
  scale: NEScale
  extractDir: string
  shpPath: string
}> {
  await ensureDirs()
  const scale = getScaleFromEnv()
  const extractDir = scale === '50m' ? NE50_EXTRACT_DIR : NE110_EXTRACT_DIR
  const zipPath = scale === '50m' ? NE50_ZIP : NE110_ZIP
  const url = URLS[scale]

  await mkdir(extractDir, { recursive: true })

  const findShp = async (): Promise<string | null> => {
    try {
      const files = await listFilesRecursive(extractDir)
      return files.find((p) => p.endsWith('.shp') && p.includes('admin_0_countries')) ?? null
    } catch {
      return null
    }
  }

  let shpPath = await findShp()

  if (!shpPath) {
    if (!(await fileExists(zipPath))) {
      const res = await fetch(url)
      if (!res.ok || !res.body) {
        throw new Error(`Natural Earth download failed: ${res.status} ${res.statusText}`)
      }
      // Node fetch returns a Web ReadableStream.
      await pipeline(Readable.fromWeb(res.body), createWriteStream(zipPath))
    }

    const zip = new AdmZip(zipPath)
    zip.extractAllTo(extractDir, true)
  }

  shpPath = shpPath ?? (await findShp())
  if (!shpPath) {
    throw new Error(`Shapefile .shp not found under ${extractDir}`)
  }

  return { scale, extractDir, shpPath }
}
