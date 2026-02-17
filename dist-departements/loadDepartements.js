import { readFile } from 'node:fs/promises';
import { geoCentroid } from 'd3-geo';
import { computeBboxRaw, computeBboxUnwrapped } from './geo.js';
function propString(props, keys) {
    for (const key of keys) {
        const value = props[key];
        if (typeof value !== 'string')
            continue;
        const clean = value.trim();
        if (clean)
            return clean;
    }
    return null;
}
function normalizeCode(code) {
    return code.trim().toUpperCase();
}
function isOfficialDepartementCode(code) {
    // France metro (01-19, 21-95) + Corse + DROM (971,972,973,974,976).
    return /^(0[1-9]|1[0-9]|2[1-9]|[3-8][0-9]|9[0-5]|2A|2B|97(1|2|3|4|6))$/.test(code);
}
export async function loadDepartementsFromGeojson(path) {
    const raw = await readFile(path, 'utf8');
    const data = JSON.parse(raw);
    if (data.type !== 'FeatureCollection') {
        throw new Error('Departements file is not a FeatureCollection');
    }
    const out = [];
    const seen = new Set();
    for (const f of data.features ?? []) {
        if (!f.geometry)
            continue;
        if (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon')
            continue;
        const props = (f.properties ?? {});
        const codeRaw = propString(props, ['code', 'code_dept', 'code_dep', 'insee_dep', 'numero']);
        const name = propString(props, ['nom', 'name', 'libelle', 'nom_dept']);
        if (!codeRaw || !name)
            continue;
        const code = normalizeCode(codeRaw);
        if (!code)
            continue;
        if (!isOfficialDepartementCode(code))
            continue;
        if (seen.has(code))
            continue;
        seen.add(code);
        const centroid = geoCentroid(f);
        const bbox_raw = computeBboxRaw(f.geometry);
        const ref = centroid[0];
        const bbox_unwrapped = computeBboxUnwrapped(f.geometry, ref);
        out.push({
            code,
            name,
            feature: f,
            centroid,
            bbox_raw,
            bbox_unwrapped_ref: ref,
            bbox_unwrapped
        });
    }
    return out.sort((a, b) => a.code.localeCompare(b.code, 'fr', { numeric: true }));
}
