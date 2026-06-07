import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeArchive } from '../tools/tile-archive-writer.mjs';
import { readArchiveIndex, getTileFromBuffer } from '../public/lib/tile-archive.mjs';

describe('tile archive round-trip', () => {
  const testTiles = [
    { z: 10, x: 100, y: 200, data: Buffer.from('tile-a'), format: 'png' },
    { z: 10, x: 101, y: 200, data: Buffer.from('tile-b'), format: 'png' },
    { z: 14, x: 15070, y: 9884, data: Buffer.from('katoomba-tile'), format: 'jpeg' },
  ];

  it('writes a valid archive and reads back all tiles', () => {
    const buffer = writeArchive(testTiles);
    const index = readArchiveIndex(buffer);
    assert.equal(index.tileCount, 3);
    assert.equal(index.version, 1);
  });

  it('retrieves tiles by z/x/y', () => {
    const buffer = writeArchive(testTiles);
    const index = readArchiveIndex(buffer);
    const tile = getTileFromBuffer(buffer, index, 14, 15070, 9884);
    assert.ok(tile);
    assert.equal(new TextDecoder().decode(tile.data), 'katoomba-tile');
    assert.equal(tile.format, 'image/jpeg');
  });

  it('returns null for missing tiles', () => {
    const buffer = writeArchive(testTiles);
    const index = readArchiveIndex(buffer);
    const tile = getTileFromBuffer(buffer, index, 14, 0, 0);
    assert.equal(tile, null);
  });

  it('handles large x/y values (uint24)', () => {
    const tiles = [
      { z: 16, x: 60000, y: 40000, data: Buffer.from('big'), format: 'png' },
    ];
    const buffer = writeArchive(tiles);
    const index = readArchiveIndex(buffer);
    const tile = getTileFromBuffer(buffer, index, 16, 60000, 40000);
    assert.ok(tile);
    assert.equal(new TextDecoder().decode(tile.data), 'big');
  });

  it('sorts entries by z/x/y regardless of input order', () => {
    const tiles = [
      { z: 14, x: 5, y: 5, data: Buffer.from('c'), format: 'png' },
      { z: 10, x: 1, y: 1, data: Buffer.from('a'), format: 'png' },
      { z: 10, x: 1, y: 2, data: Buffer.from('b'), format: 'png' },
    ];
    const buffer = writeArchive(tiles);
    const index = readArchiveIndex(buffer);
    assert.ok(getTileFromBuffer(buffer, index, 10, 1, 1));
    assert.ok(getTileFromBuffer(buffer, index, 10, 1, 2));
    assert.ok(getTileFromBuffer(buffer, index, 14, 5, 5));
  });
});

describe('readArchiveIndex iteration', () => {
  it('entries array contains all tile coordinates', () => {
    const tiles = [
      { z: 10, x: 1, y: 2, data: Buffer.from('a'), format: 'png' },
      { z: 12, x: 3, y: 4, data: Buffer.from('b'), format: 'jpeg' },
    ];
    const buffer = writeArchive(tiles);
    const index = readArchiveIndex(buffer);
    assert.equal(index.entries.length, 2);
    assert.deepEqual(
      index.entries.map(e => ({ z: e.z, x: e.x, y: e.y })),
      [{ z: 10, x: 1, y: 2 }, { z: 12, x: 3, y: 4 }]
    );
    assert.equal(index.entries[0].format, 0);
    assert.equal(index.entries[1].format, 1);
  });
});
