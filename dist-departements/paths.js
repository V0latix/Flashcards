import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
export const DATA_DIR = join(process.cwd(), 'data');
export const OUT_DIR = join(process.cwd(), 'out');
export const DEPARTEMENTS_DATA_DIR = join(DATA_DIR, 'departements');
export const DEPARTEMENTS_GEOJSON_PATH = join(DEPARTEMENTS_DATA_DIR, 'departements.geojson');
export const OUT_DEPARTEMENTS_DIR = join(OUT_DIR, 'departements');
export const OUT_SVG_DIR = join(OUT_DEPARTEMENTS_DIR, 'svg');
export async function ensureDirs() {
    await mkdir(DATA_DIR, { recursive: true });
    await mkdir(OUT_DIR, { recursive: true });
    await mkdir(DEPARTEMENTS_DATA_DIR, { recursive: true });
    await mkdir(OUT_DEPARTEMENTS_DIR, { recursive: true });
    await mkdir(OUT_SVG_DIR, { recursive: true });
}
