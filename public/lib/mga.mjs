// public/lib/mga.mjs

let proj4;
if (typeof window === 'undefined') {
  proj4 = (await import('proj4')).default;
} else {
  proj4 = window.proj4;
}

const MGA_55 = '+proj=utm +zone=55 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs';
const MGA_56 = '+proj=utm +zone=56 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs';

export function toMGA(lat, lon) {
  const zone = lon < 150 ? 55 : 56;
  const proj = zone === 55 ? MGA_55 : MGA_56;
  const [easting, northing] = proj4(proj, [lon, lat]);
  return { zone, easting, northing };
}

export function formatMGA({ zone, easting, northing }) {
  return `${zone}H ${Math.round(easting)}mE ${Math.round(northing)}mN`;
}

export function formatGridRef({ zone, easting, northing }) {
  const e3 = String(Math.floor(easting % 100000 / 100)).padStart(3, '0');
  const n3 = String(Math.floor(northing % 100000 / 100)).padStart(3, '0');
  return `${e3} ${n3}`;
}
