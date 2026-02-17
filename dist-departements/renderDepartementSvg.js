import { geoMercator, geoPath } from 'd3-geo';
const SIZE = 1000;
const MARGIN = 24;
const METRO_BOTTOM = 775;
const COLORS = {
    background: '#E7EBF0',
    otherFill: '#C8CCD2',
    targetFill: '#FFFFFF',
    stroke: '#8A939F'
};
const STROKE = {
    all: 2.1,
    target: 2.8
};
const DROM_INSETS = {
    '971': [
        [80, 812],
        [190, 948]
    ],
    '972': [
        [204, 812],
        [314, 948]
    ],
    '973': [
        [328, 812],
        [478, 948]
    ],
    '974': [
        [492, 812],
        [602, 948]
    ],
    '976': [
        [616, 812],
        [726, 948]
    ]
};
function isDromCode(code) {
    return code in DROM_INSETS;
}
function featureCollection(features) {
    return {
        type: 'FeatureCollection',
        features: features.map((d) => d.feature)
    };
}
function buildStaticLayout(departements) {
    const paths = new Map();
    const bounds = new Map();
    const metro = departements.filter((d) => !isDromCode(d.code));
    const metroProjection = geoMercator().fitExtent([
        [MARGIN, MARGIN],
        [SIZE - MARGIN, METRO_BOTTOM]
    ], featureCollection(metro));
    const metroPath = geoPath(metroProjection);
    for (const d of metro) {
        const p = metroPath(d.feature);
        if (!p)
            continue;
        paths.set(d.code, p);
        bounds.set(d.code, metroPath.bounds(d.feature));
    }
    const drom = departements.filter((d) => isDromCode(d.code));
    for (const d of drom) {
        const inset = DROM_INSETS[d.code];
        const p = geoPath(geoMercator().fitExtent(inset, d.feature));
        const dPath = p(d.feature);
        if (!dPath)
            continue;
        paths.set(d.code, dPath);
        bounds.set(d.code, p.bounds(d.feature));
    }
    const orderedCodes = departements
        .map((d) => d.code)
        .filter((c) => paths.has(c))
        .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
    return { paths, bounds, orderedCodes };
}
export function renderDepartementSvg(departements, targetCode, opts) {
    const target = departements.find((d) => d.code === targetCode);
    if (!target)
        throw new Error(`Target departement not found: ${targetCode}`);
    const layout = buildStaticLayout(departements);
    const targetPath = layout.paths.get(targetCode);
    if (!targetPath)
        throw new Error(`Target path is empty for ${targetCode}`);
    const others = layout.orderedCodes.filter((code) => code !== targetCode);
    const parts = [];
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" shape-rendering="geometricPrecision">`);
    parts.push(`<rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="${COLORS.background}"/>`);
    parts.push(`<g fill="${COLORS.otherFill}" stroke="none">`);
    for (const code of others) {
        const p = layout.paths.get(code);
        if (!p)
            continue;
        parts.push(`<path id="departement-${code}" d="${p}"/>`);
    }
    parts.push(`</g>`);
    parts.push(`<path id="departement-${target.code}" class="target" d="${targetPath}" fill="${COLORS.targetFill}" stroke="none"/>`);
    parts.push(`<g fill="none" stroke="${COLORS.stroke}" stroke-width="${STROKE.all}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke">`);
    for (const code of others) {
        const p = layout.paths.get(code);
        if (!p)
            continue;
        parts.push(`<path d="${p}"/>`);
    }
    parts.push(`<path d="${targetPath}"/>`);
    parts.push(`</g>`);
    parts.push(`<path d="${targetPath}" fill="none" stroke="${COLORS.stroke}" stroke-width="${STROKE.target}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`);
    parts.push(`</svg>`);
    const targetBounds = layout.bounds.get(target.code) ?? [
        [0, 0],
        [0, 0]
    ];
    return {
        svg: parts.join(''),
        meta: {
            code: target.code,
            name: target.name,
            centroid: { lon: target.centroid[0], lat: target.centroid[1] },
            bbox: {
                lonLat_raw: target.bbox_raw,
                lonLat_unwrapped: target.bbox_unwrapped,
                lon_ref: target.bbox_unwrapped_ref,
                lonLat_padded_unwrapped: target.bbox_unwrapped,
                padding_pct: opts?.paddingPct ?? 0,
                min_extent_deg: opts?.minExtentDeg ?? 0
            },
            projected: {
                viewBox: [0, 0, SIZE, SIZE],
                target_bounds: targetBounds
            }
        }
    };
}
