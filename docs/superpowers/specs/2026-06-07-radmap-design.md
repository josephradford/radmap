# radmap — Offline NSW Topo Map PWA

## What it is

A self-contained PWA that shows NSW topographic maps with live GPS position on an iPhone — fully offline after initial setup. No app store, no Xcode. Hosted on a home server behind HTTPS, installed to the home screen.

## Why

Replaces paid apps like Avenza for personal bushwalking. The phone becomes a GPS-enabled topo viewer that works with no signal, backed up by hard-copy paper maps that use the same MGA grid reference system.

## Data source

NSW Spatial Services topo tile server:
`https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_Topo_Map/MapServer/tile/{z}/{y}/{x}`

- 256x256 px tiles, Web Mercator (EPSG:3857), 96 DPI
- Native zoom: z0–z16 (1:25k detail at z16)
- Licensed CC BY 4.0 — personal offline caching is fine, attribution required
- ArcGIS tile order: `{z}/{y}/{x}` (row before column)

## Coverage regions

Eight national parks / reserves, all greater Sydney – Blue Mountains – Hunter corridor:

| Region | Approx bounds (SW → NE) |
|---|---|
| Blue Mountains NP | -33.85, 150.15 → -33.50, 150.55 |
| Kanangra-Boyd NP | -34.15, 149.85 → -33.75, 150.20 |
| Marramarra NP | -33.55, 151.05 → -33.40, 151.20 |
| Muogamarra NR | -33.60, 151.10 → -33.52, 151.20 |
| Ku-ring-gai Chase NP | -33.70, 151.10 → -33.55, 151.30 |
| Dharug NP | -33.50, 150.95 → -33.35, 151.10 |
| Yengo NP | -33.20, 150.75 → -32.85, 151.15 |
| Wollemi NP | -33.50, 149.80 → -32.65, 150.85 |

Zoom levels: z10 (regional overview) through z16 (contour-reading detail).

Estimated total: ~100,000 tiles, ~2–3 GB.

## Architecture

Three components:

### 1. Tile downloader (build-time, runs on dev machine)

A Node.js script that:
- Takes the region definitions (name + bounding box + zoom range)
- Downloads tiles from the NSW server for each region
- Packs each region into a single binary file with an index (tile archive)
- Outputs one `.tiles` file per region + a manifest JSON listing all regions and their metadata (name, bounds, tile count, file size)

The archive format is simple and custom — no external dependencies like PMTiles.

**`.tiles` archive format:**
```
[4 bytes]  magic: "RMAP"
[4 bytes]  version: uint32 LE (1)
[4 bytes]  tile count: uint32 LE
[N × 16 bytes]  index entries, each:
  [1 byte]   z (zoom level)
  [3 bytes]  x (column, uint24 LE)
  [3 bytes]  y (row, uint24 LE)
  [4 bytes]  offset from start of data section (uint32 LE)
  [4 bytes]  length in bytes (uint32 LE)
  [1 byte]   format (0 = PNG, 1 = JPEG)
[remaining bytes]  concatenated tile image data
```

Index is sorted by z/x/y for binary search. Max tile count per archive: ~16 million (uint24 x/y), which is more than enough.

Rate limiting: polite delays between requests (100–200ms) to avoid hammering the NSW server. Download is a one-time operation.

### 2. Static file server (home server)

The home server (behind existing HTTPS reverse proxy) serves:
- `index.html` — the app (single file, Leaflet + all UI)
- `sw.js` — service worker
- `manifest.json` — PWA manifest for home screen install
- `tiles/*.tiles` — the packed tile archives
- `tiles/manifest.json` — region metadata

No backend logic. Pure static files.

### 3. PWA client (runs on iPhone)

Single-page app built with Leaflet 1.9. All dependencies loaded from CDN on first visit, then cached by the service worker.

**App shell:**
- `index.html`, `sw.js`, `manifest.json`, Leaflet CSS/JS from CDN
- Cached by service worker on first load — app loads offline after that

**Tile storage:**
- On first use, a download manager UI fetches each region's `.tiles` archive
- Archives are stored in IndexedDB as-is (no unpacking into individual tiles)
- A custom Leaflet tile layer reads tiles from IndexedDB by computing the byte offset from the archive index
- This avoids 100,000 individual IndexedDB entries — one blob per region instead

**Tile serving flow:**
1. Leaflet requests tile at `{z}/{y}/{x}`
2. Custom tile layer checks if any downloaded region contains that tile
3. If yes → read from IndexedDB archive → return tile image
4. If no → return blank (offline) or fetch from NSW server (online fallback)

**GPS:**
- `navigator.geolocation.watchPosition` with high accuracy
- Pulsing position marker + accuracy circle
- Follow mode (auto-centres map on position, drops on manual pan)
- Locate button (one-shot centre + start watching)

**MGA grid reference:**
- proj4js library to project WGS-84 → MGA2020 zone 56 (EPSG:7856)
- All 8 parks fall in zone 56 (east of 150°E), except western edges of Wollemi/Kanangra which cross into zone 55 (EPSG:7855)
- Zone selection: longitude < 150°E → zone 55 (EPSG:7855), longitude ≥ 150°E → zone 56 (EPSG:7856)
- Display: full easting/northing (e.g. `56H 295800mE 6255600mN`) + truncated 6-figure grid ref
- Updates on crosshair (map centre) and on GPS fix

**Coordinate readout:**
- Centre crosshair with decimal degrees + DMS + MGA grid reference
- GPS status indicator (idle / locating / fix with accuracy / error)

**Download manager:**
- Shows list of regions with tile count and file size
- Download button per region (or download all)
- Progress bar during download
- Status: not downloaded / downloading / ready
- Delete button to reclaim storage

## UI

Carry forward the v1 field-instrument aesthetic:
- Dark translucent control panels with backdrop blur
- Monospace readouts, tabular numerals
- Amber accent (contour colour), green for GPS fix
- System font stack only — no web fonts (works with no signal)
- Safe-area-inset handling for iPhone notch/dynamic island
- Centre crosshair with coordinate readout panel
- Bottom control bar: Locate, Follow, Layers (disabled until aerial added), Download

## PWA details

- `manifest.json`: app name "radmap", standalone display, dark theme, app icon
- Service worker strategy:
  - App shell (HTML, JS, CSS, CDN libs): cache-first, update in background
  - Tile archives in IndexedDB: managed by download manager, not by service worker
  - Service worker intercepts tile URL requests and routes to the IndexedDB reader
- `navigator.storage.persist()` requested on install to reduce iOS eviction risk

## Offline guarantees

After downloading tile archives:
- App shell loads from service worker cache — no network needed
- Tiles load from IndexedDB — no network needed
- GPS is satellite-based — no network needed
- proj4js is bundled/cached — no network needed
- Only thing that won't work offline: CDN fallback for Leaflet (but it's cached on first load)

Pre-hike check: open the app, confirm tiles render. If cache was evicted, re-download on wifi.

## What's NOT in v1

- Aerial imagery layer (add later as a second tile set)
- GPX track import/export
- Waypoint dropping
- Compass / heading indicator
- Distance / area measurement
- Share position
- Night mode

## Tech stack

- Leaflet 1.9 (CDN, cached by service worker)
- proj4js (CDN, cached by service worker)
- Vanilla JS — no framework, no build step for the client
- Node.js for the tile downloader script
- No backend runtime

## Licensing

All map data: © State of NSW (Spatial Services), CC BY 4.0. Attribution displayed in the map control.
