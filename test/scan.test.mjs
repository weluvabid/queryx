import test from 'node:test';
import assert from 'node:assert/strict';
import { get, getAll, has, parse, pick, scan, stringify, stringifyForm } from '../dist/index.js';
import {
  decodeComponent,
  decodeComponentSpan,
  encodeComponent,
  encodeFormComponent,
} from '../dist/codec.js';

test('scan exposes raw spans and defers decoding', () => {
  const [entry] = [...scan('?a%20b=c+d')];

  assert.equal(entry.source.slice(entry.keyStart, entry.keyEnd), 'a%20b');
  assert.equal(entry.decodeKey(), 'a b');
  assert.equal(entry.decodeValue(), 'c d');
});

test('scan entries share decoding methods and preserve valueless spans', () => {
  const entries = [...scan('?alpha=one&flag&beta%20key=two+words')];

  assert.equal(entries.length, 3);
  assert.equal(entries[0].decode, entries[1].decode);
  assert.equal(entries[0].decodeKey(), 'alpha');
  assert.equal(entries[0].decodeValue(), 'one');
  assert.deepEqual(entries[1].decode(), { key: 'flag', value: null });
  assert.deepEqual(entries[2].decode(), { key: 'beta key', value: 'two words' });
});

test('handles long flat input iteratively', () => {
  const query = Array.from({ length: 15000 }, (_, i) => `k${i}=v${i}`).join('&');

  assert.equal([...scan(query)].length, 15000);
  assert.equal(get(query, 'k14999'), 'v14999');
});
