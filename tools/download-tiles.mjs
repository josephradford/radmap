import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { REGIONS, ZOOM_MIN, ZOOM_MAX } from '../public/lib/regions.mjs';
import { tilesInBbox, tileCount } from '../public/lib/tile-math.mjs';
import { writeArchive } from './tile-archive-writer.mjs';

const TILE_URL = 'https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Topo_Map/MapServer/tile';
const DELAY_MS = 150;
const MAX_RETRIES = 3;
const OUTPUT_DIR = join(import.meta.dirname, '..', 'public', 'tiles');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchTile(z, y, x, retries = 0) {
  const url = `${TILE_URL}/${z}/${y}/${x}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      if (retries < MAX_RETRIES) {
        await sleep(1000 * (retries + 1));
        return fetchTile(z, y, x, retries + 1);
      }
      console.error(`  SKIP ${z}/${y}/${x} — HTTP ${res.status}`);
      return null;
    }
    const contentType = res.headers.get('content-type') || '';
    const format = contentType.includes('jpeg') ? 'jpeg' : 'png';
    const data = Buffer.from(await res.arrayBuffer());
    return { z, x, y, data, format };
  } catch (err) {
    if (retries < MAX_RETRIES) {
      await sleep(1000 * (retries + 1));
      return fetchTile(z, y, x, retries + 1);
    }
    console.error(`  SKIP ${z}/${y}/${x} — ${err.message}`);
    return null;
  }
}

async function downloadRegion(region) {
  const { id, name, bounds } = region;
  const total = tileCount(bounds.south, bounds.west, bounds.north, bounds.east, ZOOM_MIN, ZOOM_MAX);
  console.log(`\n${name} (${id}): ${total.toLocaleString()} tiles`);

  const tiles = [];
  let done = 0;

  for (let z = ZOOM_MIN; z <= ZOOM_MAX; z++) {
    const zoomTiles = tilesInBbox(bounds.south, bounds.west, bounds.north, bounds.east, z);
    console.log(`  z${z}: ${zoomTiles.length.toLocaleString()} tiles`);

    for (const { x, y } of zoomTiles) {
      const tile = await fetchTile(z, y, x);
      if (tile) tiles.push(tile);
      done++;
      if (done % 500 === 0) {
        process.stdout.write(`  ${done}/${total} (${Math.round(100 * done / total)}%)\r`);
      }
      await sleep(DELAY_MS);
    }
  }

  console.log(`  Downloaded ${tiles.length}/${total} tiles`);

  const archiveBuf = writeArchive(tiles);
  const outPath = join(OUTPUT_DIR, `${id}.tiles`);
  writeFileSync(outPath, archiveBuf);
  console.log(`  Archive: ${outPath} (${(archiveBuf.length / 1024 / 1024).toFixed(1)} MB)`);

  return {
    id,
    name,
    bounds,
    tileCount: tiles.length,
    fileSize: archiveBuf.length,
  };
}

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const regionFilter = process.argv[2];
  const regions = regionFilter
    ? REGIONS.filter(r => r.id === regionFilter)
    : REGIONS;

  if (regions.length === 0) {
    console.error(`Unknown region: ${regionFilter}`);
    console.error(`Available: ${REGIONS.map(r => r.id).join(', ')}`);
    process.exit(1);
  }

  console.log(`Downloading ${regions.length} region(s)...`);
  const manifest = [];

  for (const region of regions) {
    const meta = await downloadRegion(region);
    manifest.push(meta);
  }

  const manifestPath = join(OUTPUT_DIR, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest: ${manifestPath}`);
  console.log('Done.');
}

main();
