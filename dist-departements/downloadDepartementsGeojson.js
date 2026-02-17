import { stat, writeFile } from 'node:fs/promises';
import { ensureDirs, DEPARTEMENTS_GEOJSON_PATH } from './paths.js';
const DEFAULT_GEOJSON_URL = 'https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/latest/geojson/departements-1000m.geojson';
const FALLBACK_URLS = [
    'https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/latest/geojson/departements-100m.geojson',
    'https://etalab-datasets.geo.data.gouv.fr/contours-administratifs/2024/geojson/departements-100m.geojson',
    'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements.geojson'
];
function getGeojsonUrl() {
    const value = (process.env.DEPARTEMENTS_GEOJSON_URL ?? '').trim();
    return value || DEFAULT_GEOJSON_URL;
}
async function fileExists(path) {
    try {
        await stat(path);
        return true;
    }
    catch {
        return false;
    }
}
export async function downloadDepartementsGeojson(force = false) {
    await ensureDirs();
    const primary = getGeojsonUrl();
    if (!force && (await fileExists(DEPARTEMENTS_GEOJSON_PATH))) {
        return { path: DEPARTEMENTS_GEOJSON_PATH, url: primary };
    }
    const urls = [primary, ...FALLBACK_URLS];
    let lastError = null;
    for (const url of urls) {
        const res = await fetch(url);
        if (!res.ok) {
            lastError = `${url}: ${res.status} ${res.statusText}`;
            continue;
        }
        const body = await res.text();
        if (!body.trim().startsWith('{')) {
            lastError = `${url}: invalid payload`;
            continue;
        }
        await writeFile(DEPARTEMENTS_GEOJSON_PATH, body, 'utf8');
        return { path: DEPARTEMENTS_GEOJSON_PATH, url };
    }
    throw new Error(`Departements GeoJSON download failed. Last error: ${lastError ?? 'unknown'}`);
}
