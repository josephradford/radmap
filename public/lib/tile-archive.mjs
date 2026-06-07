const HEADER_SIZE = 12;
const ENTRY_SIZE = 16;

function readUint24LE(view, offset) {
  return view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16);
}

export function readArchiveIndex(buffer) {
  const ab = buffer instanceof ArrayBuffer
    ? buffer
    : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const view = new DataView(ab);

  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== 'RMAP') throw new Error('Not a valid .tiles archive');

  const version = view.getUint32(4, true);
  const tileCount = view.getUint32(8, true);

  const entries = [];
  for (let i = 0; i < tileCount; i++) {
    const eo = HEADER_SIZE + i * ENTRY_SIZE;
    entries.push({
      z: view.getUint8(eo),
      x: readUint24LE(view, eo + 1),
      y: readUint24LE(view, eo + 4),
      offset: view.getUint32(eo + 7, true),
      length: view.getUint32(eo + 11, true),
      format: view.getUint8(eo + 15),
    });
  }

  const dataOffset = HEADER_SIZE + tileCount * ENTRY_SIZE;
  return { version, tileCount, entries, dataOffset };
}

export function getTileFromBuffer(buffer, index, z, x, y) {
  const ab = buffer instanceof ArrayBuffer
    ? buffer
    : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  let lo = 0;
  let hi = index.entries.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const e = index.entries[mid];
    const cmp = z - e.z || x - e.x || y - e.y;
    if (cmp === 0) {
      return {
        data: new Uint8Array(ab, index.dataOffset + e.offset, e.length),
        format: e.format === 0 ? 'image/png' : 'image/jpeg',
      };
    }
    if (cmp < 0) hi = mid - 1;
    else lo = mid + 1;
  }
  return null;
}
