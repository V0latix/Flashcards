import type * as GeoJSON from 'geojson'
import * as shapefile from 'shapefile'
import { geoCentroid } from 'd3-geo'
import { computeBboxRaw, computeBboxUnwrapped } from './geo.js'
import type { CountryFeature } from './types.js'

const NUL_CHAR = String.fromCharCode(0)

function stripNulBytes(value: string): string {
  return value.split(NUL_CHAR).join('')
}

function fixMojibake(s: string): string {
  // Fix common UTF-8-as-cp1252 mojibake: "BÃ©nin" -> "Bénin", "Ã‰mirats" -> "Émirats"
  // Heuristic: only attempt if we see telltale sequences.
  if (!/[ÃÂ]/.test(s) && !/[€™œ‰“”–—…]/.test(s)) return s

  const CP1252_EXT: Record<string, number> = {
    '€': 0x80,
    '‚': 0x82,
    'ƒ': 0x83,
    '„': 0x84,
    '…': 0x85,
    '†': 0x86,
    '‡': 0x87,
    'ˆ': 0x88,
    '‰': 0x89,
    'Š': 0x8a,
    '‹': 0x8b,
    'Œ': 0x8c,
    'Ž': 0x8e,
    '‘': 0x91,
    '’': 0x92,
    '“': 0x93,
    '”': 0x94,
    '•': 0x95,
    '–': 0x96,
    '—': 0x97,
    '˜': 0x98,
    '™': 0x99,
    'š': 0x9a,
    '›': 0x9b,
    'œ': 0x9c,
    'ž': 0x9e,
    'Ÿ': 0x9f
  }

  const bytes: number[] = []
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0
    if (code <= 0xff) {
      bytes.push(code)
      continue
    }
    const b = CP1252_EXT[ch]
    if (b === undefined) {
      return s
    }
    bytes.push(b)
  }

  try {
    const converted = Buffer.from(bytes).toString('utf8')
    if (!converted.trim()) return s
    if (converted.includes('\uFFFD')) return s
    return converted
  } catch {
    return s
  }
}

function getString(props: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = props[k]
    if (typeof v === 'string') {
      // Natural Earth DBF strings can contain trailing NUL bytes.
      const s = fixMojibake(stripNulBytes(v).trim())
      if (s) return s
    }
  }
  return null
}

function normalizeIso2(value: string | null): string | null {
  if (!value) return null
  const v = stripNulBytes(value).trim().toUpperCase()
  if (v === '-99') return null
  // Some DBF values can carry stray non-letters; keep only A-Z.
  const letters = v.replace(/[^A-Z]/g, '')
  if (letters.length !== 2) return null
  return letters
}

function normalizeIso3(value: string | null): string | null {
  if (!value) return null
  const v = stripNulBytes(value).trim().toUpperCase()
  if (v === '-99') return null
  const letters = v.replace(/[^A-Z]/g, '')
  if (letters.length !== 3) return null
  return letters
}

export async function loadCountriesFromShapefile(shpPath: string): Promise<CountryFeature[]> {
  const fc = (await shapefile.read(shpPath)) as GeoJSON.FeatureCollection<GeoJSON.Geometry, Record<string, unknown>>

  const out: CountryFeature[] = []
  let skippedMissingIso2 = 0
  for (const f of fc.features) {
    if (!f.geometry) continue
    const props = (f.properties ?? {}) as Record<string, unknown>

    const iso2 =
      normalizeIso2(getString(props, 'ISO_A2')) ??
      normalizeIso2(getString(props, 'ISO_A2_EH')) ??
      null

    const iso3 =
      normalizeIso3(getString(props, 'ISO_A3')) ??
      normalizeIso3(getString(props, 'ISO_A3_EH')) ??
      normalizeIso3(getString(props, 'ADM0_A3')) ??
      normalizeIso3(getString(props, 'SOV_A3')) ??
      null

    if (!iso2) {
      skippedMissingIso2++
      continue
    }

    const name_en = getString(props, 'NAME_EN', 'NAME', 'ADMIN') ?? iso2
    const name_fr = getString(props, 'NAME_FR', 'NAME_FRCA', 'NAME_FR') ?? name_en

    const centroid = geoCentroid(f as unknown as GeoJSON.GeoJSON) as [number, number]
    const bbox_raw = computeBboxRaw(f.geometry)
    const ref = centroid[0]
    const bbox_unwrapped = computeBboxUnwrapped(f.geometry, ref)

    out.push({
      iso2,
      iso3,
      name_en,
      name_fr,
      feature: f,
      centroid,
      bbox_raw,
      bbox_unwrapped_ref: ref,
      bbox_unwrapped
    })
  }

  if (skippedMissingIso2 > 0) {
    console.warn(`loadCountries: skipped ${skippedMissingIso2} features without ISO2`)
  }

  return out.sort((a, b) => a.iso2.localeCompare(b.iso2))
}
