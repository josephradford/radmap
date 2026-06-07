const HEADER_SIZE = 12;
const ENTRY_SIZE = 16;

export function writeArchive(tiles) {
  const sorted = [...tiles].sort((a, b) => a.z - b.z || a.x - b.x || a.y - b.y);
  const count = sorted.length;

  let totalDataSize = 0;
  for (const t of sorted) totalDataSize += t.data.length;

  const indexSize = count * ENTRY_SIZE;
  const buf = Buffer.alloc(HEADER_SIZE + indexSize + totalDataSize);

  buf.write('RMAP', 0, 4, 'ascii');
  buf.writeUInt32LE(1, 4);
  buf.writeUInt32LE(count, 8);

  let dataOffset = 0;
  for (let i = 0; i < count; i++) {
    const t = sorted[i];
    const eo = HEADER_SIZE + i * ENTRY_SIZE;

    buf.writeUInt8(t.z, eo);
    buf.writeUInt8(t.x & 0xff, eo + 1);
    buf.writeUInt8((t.x >> 8) & 0xff, eo + 2);
    buf.writeUInt8((t.x >> 16) & 0xff, eo + 3);
    buf.writeUInt8(t.y & 0xff, eo + 4);
    buf.writeUInt8((t.y >> 8) & 0xff, eo + 5);
    buf.writeUInt8((t.y >> 16) & 0xff, eo + 6);
    buf.writeUInt32LE(dataOffset, eo + 7);
    buf.writeUInt32LE(t.data.length, eo + 11);
    buf.writeUInt8(t.format === 'jpeg' ? 1 : 0, eo + 15);

    t.data.copy(buf, HEADER_SIZE + indexSize + dataOffset);
    dataOffset += t.data.length;
  }

  return buf;
}
