# radmap: static PWA served by nginx. Tile archives (public/tiles/*.tiles, ~1 GB)
# are NOT baked in — mount them at /usr/share/nginx/html/tiles at runtime.
FROM nginx:alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY public/ /usr/share/nginx/html/
