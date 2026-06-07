// public/lib/tile-math.mjs

export function latLonToTile(lat, lon, zoom) {
  const n = 2 ** zoom;
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return {
    x: Math.max(0, Math.min(n - 1, x)),
    y: Math.max(0, Math.min(n - 1, y)),
  };
}

export function tileToLatLon(x, y, zoom) {
  const n = 2 ** zoom;
  const lon = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const lat = (latRad * 180) / Math.PI;
  return { lat, lon };
}

export function tileBounds(x, y, zoom) {
  const nw = tileToLatLon(x, y, zoom);
  const se = tileToLatLon(x + 1, y + 1, zoom);
  return { north: nw.lat, west: nw.lon, south: se.lat, east: se.lon };
}

export function tilesInBbox(south, west, north, east, zoom) {
  const min = latLonToTile(north, west, zoom);
  const max = latLonToTile(south, east, zoom);
  const tiles = [];
  for (let x = min.x; x <= max.x; x++) {
    for (let y = min.y; y <= max.y; y++) {
      tiles.push({ z: zoom, x, y });
    }
  }
  return tiles;
}

export function tileCount(south, west, north, east, zoomMin, zoomMax) {
  let count = 0;
  for (let z = zoomMin; z <= zoomMax; z++) {
    count += tilesInBbox(south, west, north, east, z).length;
  }
  return count;
}
