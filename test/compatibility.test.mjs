import test from 'node:test';
import assert from 'node:assert/strict';
import { get, getAll, has, parse, pick, scan, stringify, stringifyForm } from '../dist/index.js';
import { decodeComponent, decodeComponentSpan, encodeComponent, encodeFormComponent } from '../dist/codec.js';

test('matches URLSearchParams for valid form-query pairs', () => {
  let seed = 0x12345678;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  const alphabet = 'abcXYZ012 _-~✓';
  for (let round = 0; round < 500; round++) {
    const pairs = [];
    const count = random() % 30;
    for (let i = 0; i < count; i++) {
      let key = '';
      let value = '';
      const keyLength = random() % 12;
      const valueLength = random() % 20;
      for (let j = 0; j < keyLength; j++) key += alphabet[random() % alphabet.length];
      for (let j = 0; j < valueLength; j++) value += alphabet[random() % alphabet.length];
      pairs.push([key, value]);
    }
    const query = new URLSearchParams(pairs).toString();
    const expected = new Map();
    for (const [key, value] of new URLSearchParams(query)) {
      const previous = expected.get(key);
      if (previous === undefined) expected.set(key, value);
      else if (Array.isArray(previous)) previous.push(value);
      else expected.set(key, [previous, value]);
    }
    const actual = parse(query);
    assert.deepEqual(Object.keys(actual).sort(), [...expected.keys()].sort());
    for (const [key, value] of expected) assert.deepEqual(actual[key], value);
  }
});


test('handles malformed and oversized flat inputs without recursion', () => {
  const query = `x=${'%'.repeat(50000)}&tail=ok`;
  assert.equal(get(query, 'tail'), 'ok');
  assert.equal(parse(query).tail, 'ok');
});



test('replacement decoding agrees with URLSearchParams on malformed UTF-8', () => {
  let seed = 0xDEADBEEF;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  for (let round = 0; round < 500; round++) {
    let raw = '';
    const length = random() % 25;
    for (let i = 0; i < length; i++) {
      raw += `%${(random() % 256).toString(16).padStart(2, '0')}`;
      if (random() % 5 === 0) raw += 'x';
    }
    const expected = new URLSearchParams(`x=${raw}`).get('x');
    assert.equal(parse(`x=${raw}`).x, expected);
  }
});


test('exports immutable option constants from the public entry point', async () => {
  const api = await import('../dist/index.js');
  assert.deepEqual(api.DECODE_MODES, ['throw', 'replace', 'preserve']);
  assert.deepEqual(api.DUPLICATE_MODES, ['combine', 'first', 'last']);
  assert.deepEqual(api.QUERY_ORDERS, ['insertion', 'sorted']);
  assert.equal(Object.isFrozen(api.DECODE_MODES), true);
  assert.equal(Object.isFrozen(api.DUPLICATE_MODES), true);
  assert.equal(Object.isFrozen(api.QUERY_ORDERS), true);
});
