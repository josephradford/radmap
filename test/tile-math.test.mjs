// test/tile-math.test.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  latLonToTile,
  tileToLatLon,
  tileBounds,
  tilesInBbox,
  tileCount,
} from '../public/lib/tile-math.mjs';

describe('latLonToTile', () => {
  it('converts Katoomba at z14', () => {
    const { x, y } = latLonToTile(-33.7126, 150.3119, 14);
    assert.equal(x, 15032);
    assert.equal(y, 9823);
  });

  it('converts origin at z0', () => {
    const { x, y } = latLonToTile(0, 0, 0);
    assert.equal(x, 0);
    assert.equal(y, 0);
  });

  it('clamps to valid tile range', () => {
    const { x, y } = latLonToTile(0, 180, 1);
    assert.equal(x, 1);
    assert.ok(y >= 0);
  });
});

describe('tileToLatLon', () => {
  it('returns NW corner of tile', () => {
    const { lat, lon } = tileToLatLon(0, 0, 0);
    assert.ok(Math.abs(lat - 85.051) < 0.01);
    assert.equal(lon, -180);
  });
});

describe('tileBounds', () => {
  it('returns bounding box of a tile', () => {
    const b = tileBounds(15032, 9823, 14);
    // Katoomba (-33.7126, 150.3119) should be inside this tile
    assert.ok(b.south < -33.7126 && b.north > -33.7126);
    assert.ok(b.west < 150.3119 && b.east > 150.3119);
  });

  it('north > south and east > west', () => {
    const b = tileBounds(100, 100, 10);
    assert.ok(b.north > b.south);
    assert.ok(b.east > b.west);
  });
});

describe('tilesInBbox', () => {
  it('returns all tiles covering a small area', () => {
    const tiles = tilesInBbox(-33.72, 150.30, -33.70, 150.32, 14);
    assert.ok(tiles.length >= 1);
    assert.ok(tiles.every(t => t.z === 14));
    assert.ok(tiles.some(t => t.x === 15032 && t.y === 9823));
  });

  it('returns single tile for point bbox at z0', () => {
    const tiles = tilesInBbox(-1, -1, 1, 1, 0);
    assert.equal(tiles.length, 1);
    assert.deepEqual(tiles[0], { z: 0, x: 0, y: 0 });
  });
});

describe('tileCount', () => {
  it('sums tile counts across zoom levels', () => {
    const count = tileCount(-33.72, 150.30, -33.70, 150.32, 14, 14);
    const tiles = tilesInBbox(-33.72, 150.30, -33.70, 150.32, 14);
    assert.equal(count, tiles.length);
  });

  it('increases with more zoom levels', () => {
    const one = tileCount(-33.72, 150.30, -33.70, 150.32, 14, 14);
    const two = tileCount(-33.72, 150.30, -33.70, 150.32, 14, 15);
    assert.ok(two > one);
  });
});
