import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toMGA, formatMGA, formatGridRef } from '../public/lib/mga.mjs';

describe('toMGA', () => {
  it('projects Sydney Harbour Bridge to zone 56', () => {
    // Sydney Harbour Bridge: -33.8523, 151.2108 → MGA56 ~334476mE, ~6252781mN
    const mga = toMGA(-33.8523, 151.2108);
    assert.equal(mga.zone, 56);
    assert.ok(Math.abs(mga.easting - 334476) < 150);
    assert.ok(Math.abs(mga.northing - 6252781) < 150);
  });

  it('projects Katoomba to zone 56', () => {
    // Katoomba: -33.7126, 150.3119
    const mga = toMGA(-33.7126, 150.3119);
    assert.equal(mga.zone, 56);
    assert.ok(mga.easting > 200000 && mga.easting < 400000);
    assert.ok(mga.northing > 6000000 && mga.northing < 6500000);
  });

  it('uses zone 55 west of 150°E', () => {
    const mga = toMGA(-33.0, 149.9);
    assert.equal(mga.zone, 55);
  });

  it('uses zone 56 at exactly 150°E', () => {
    const mga = toMGA(-33.0, 150.0);
    assert.equal(mga.zone, 56);
  });
});

describe('formatMGA', () => {
  it('formats full MGA string', () => {
    const s = formatMGA({ zone: 56, easting: 295800.4, northing: 6255600.2 });
    assert.equal(s, '56H 295800mE 6255600mN');
  });
});

describe('formatGridRef', () => {
  it('formats 6-figure grid reference', () => {
    const s = formatGridRef({ zone: 56, easting: 295823.4, northing: 6255645.2 });
    assert.equal(s, '958 556');
  });

  it('pads with leading zeros', () => {
    const s = formatGridRef({ zone: 56, easting: 200100, northing: 6000200 });
    assert.equal(s, '001 002');
  });
});
