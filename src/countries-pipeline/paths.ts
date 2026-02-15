import { mkdir, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

export const DATA_DIR = join(process.cwd(), 'data')
export const OUT_DIR = join(process.cwd(), 'out')
export const OUT_SVG_DIR = join(OUT_DIR, 'svg')
export const OUT_SVG_BLUE_DIR = join(OUT_DIR, 'svg-blue')

export const NE_DIR = join(DATA_DIR, 'natural-earth')

export const NE110_ZIP = join(NE_DIR, 'ne_110m_admin_0_countries.zip')
export const NE110_EXTRACT_DIR = join(NE_DIR, 'ne_110m_admin_0_countries')

export const NE50_ZIP = join(NE_DIR, 'ne_50m_admin_0_countries.zip')
export const NE50_EXTRACT_DIR = join(NE_DIR, 'ne_50m_admin_0_countries')

export async function ensureDirs() {
  await mkdir(DATA_DIR, { recursive: true })
  await mkdir(OUT_DIR, { recursive: true })
  await mkdir(OUT_SVG_DIR, { recursive: true })
  await mkdir(OUT_SVG_BLUE_DIR, { recursive: true })
  await mkdir(NE_DIR, { recursive: true })
}

export async function listFilesRecursive(dir: string): Promise<string[]> {
  const out: string[] = []
  const entries = await readdir(dir)
  for (const entry of entries) {
    const p = join(dir, entry)
    const s = await stat(p)
    if (s.isDirectory()) {
      out.push(...(await listFilesRecursive(p)))
    } else {
      out.push(p)
    }
  }
  return out
}
