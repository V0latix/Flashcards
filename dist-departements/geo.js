export function unwrapLon(lon, refLon) {
    let x = lon;
    while (x - refLon > 180)
        x -= 360;
    while (x - refLon < -180)
        x += 360;
    return x;
}
export function computeBboxRaw(geom) {
    let minLon = Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let maxLat = -Infinity;
    const visit = (lon, lat) => {
        if (lon < minLon)
            minLon = lon;
        if (lat < minLat)
            minLat = lat;
        if (lon > maxLon)
            maxLon = lon;
        if (lat > maxLat)
            maxLat = lat;
    };
    const walk = (g) => {
        if (g.type === 'Polygon') {
            g.coordinates.forEach((ring) => ring.forEach(([lon, lat]) => visit(lon, lat)));
            return;
        }
        if (g.type === 'MultiPolygon') {
            g.coordinates.forEach((poly) => poly.forEach((ring) => ring.forEach(([lon, lat]) => visit(lon, lat))));
            return;
        }
        if (g.type === 'GeometryCollection') {
            g.geometries.forEach(walk);
        }
    };
    walk(geom);
    if (!Number.isFinite(minLon) || !Number.isFinite(minLat) || !Number.isFinite(maxLon) || !Number.isFinite(maxLat)) {
        return [0, 0, 0, 0];
    }
    return [minLon, minLat, maxLon, maxLat];
}
export function computeBboxUnwrapped(geom, refLon) {
    let minLon = Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let maxLat = -Infinity;
    const visit = (lon, lat) => {
        const x = unwrapLon(lon, refLon);
        if (x < minLon)
            minLon = x;
        if (lat < minLat)
            minLat = lat;
        if (x > maxLon)
            maxLon = x;
        if (lat > maxLat)
            maxLat = lat;
    };
    const walk = (g) => {
        if (g.type === 'Polygon') {
            g.coordinates.forEach((ring) => ring.forEach(([lon, lat]) => visit(lon, lat)));
            return;
        }
        if (g.type === 'MultiPolygon') {
            g.coordinates.forEach((poly) => poly.forEach((ring) => ring.forEach(([lon, lat]) => visit(lon, lat))));
            return;
        }
        if (g.type === 'GeometryCollection') {
            g.geometries.forEach(walk);
        }
    };
    walk(geom);
    if (!Number.isFinite(minLon) || !Number.isFinite(minLat) || !Number.isFinite(maxLon) || !Number.isFinite(maxLat)) {
        return [0, 0, 0, 0];
    }
    return [minLon, minLat, maxLon, maxLat];
}
export function bboxIntersects(a, b) {
    return !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3]);
}
export function bboxPadAndMinExtent(bbox, padPct, minExtentDeg) {
    const [minX, minY, maxX, maxY] = bbox;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const w0 = Math.max(maxX - minX, minExtentDeg);
    const h0 = Math.max(maxY - minY, minExtentDeg);
    const w = w0 * (1 + 2 * padPct);
    const h = h0 * (1 + 2 * padPct);
    return [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
}
export function bboxToMultiPoint(b) {
    const [minX, minY, maxX, maxY] = b;
    return {
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'MultiPoint',
            coordinates: [
                [minX, minY],
                [maxX, minY],
                [maxX, maxY],
                [minX, maxY]
            ]
        }
    };
}
