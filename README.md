# radmap

Offline NSW topographic map PWA with live GPS position, built for bushwalking in
the Sydney – Blue Mountains – Hunter corridor. No app store: host it over HTTPS,
open it in Safari and "Add to Home Screen". After the tile archives are
downloaded once, it works with no signal.

Map data: NSW Spatial Services topographic map tiles, CC BY 4.0
(https://maps.six.nsw.gov.au). Leaflet and proj4js are loaded from cdnjs on first
visit and then cached by the service worker.

## How it works

- `public/` is a static single-page app (Leaflet). A service worker caches the app shell.
- Each region (Blue Mountains, Kanangra-Boyd, Wollemi, ...) is one `.tiles` archive
  with an index. The in-app download manager fetches an archive and stores it in
  IndexedDB; a custom tile layer reads tiles straight from it by byte offset.
- The server is only needed for HTTPS hosting, first install, downloading regions and
  app updates. There is no backend or database.

Regions and zoom range (z10-z16) are defined in `public/lib/regions.mjs`. Design notes
are in `docs/superpowers/specs/`.

## Tile archives

The archives are about 1 GB in total, so they are gitignored and are never part of the
image. Generate them on a dev machine (polite 150 ms delay between requests; this is a
one-time download):

```bash
npm install
npm run download            # all regions
node tools/download-tiles.mjs blue-mountains   # one region
```

Output goes to `public/tiles/` (`<region>.tiles` plus `manifest.json`).

## Docker image

Pushes to `main` run the tests, then publish `ghcr.io/josephradford/radmap`
(`:latest` and `:<commit sha>`) via GitHub Actions. The image is `nginx:alpine` plus
`public/` and `deploy/nginx.conf`. Mount the archives at runtime:

```bash
docker run -p 8080:80 \
  -v /path/to/tiles:/usr/share/nginx/html/tiles:ro \
  ghcr.io/josephradford/radmap:latest
```

Without the mount the app loads but has no regions to download.

The first time a new GHCR package is published it is private; set it to public under
the package settings if the host pulls without credentials. Home server deployment
(Traefik, LAN/VPN only) lives in
[home-server-stack](https://github.com/josephradford/home-server-stack).

## Development

```bash
npm test                  # node --test
npx serve public          # local static server (service worker needs localhost or HTTPS)
```
