import test from 'node:test';
import assert from 'node:assert/strict';
import { get, getAll, has, parse, pick, scan, stringify, stringifyForm } from '../dist/index.js';
import { decodeComponent, decodeComponentSpan, encodeComponent, encodeFormComponent } from '../dist/codec.js';

test('span decoding matches component decoding without changing source boundaries', () => {
  const source = 'prefix:a+b%20c:suffix';
  const start = source.indexOf(':') + 1;
  const end = source.lastIndexOf(':');
  assert.equal(decodeComponentSpan(source, start, end), decodeComponent(source.slice(start, end)));
  assert.equal(decodeComponentSpan(source, start, end), 'a b c');
  assert.equal(decodeComponentSpan(source, start, end, 'throw'), 'a b c');
  assert.equal(decodeComponentSpan(source, start, end, 'preserve'), 'a b c');
  assert.equal(decodeComponentSpan(source, 0, 6), 'prefix');
});


test('component encoders preserve RFC 3986 and form semantics across edge cases', () => {
  const values = [
    '',
    'plain-ascii_123.~',
    "!'()*~",
    'a b  c',
    'a&b=c/d?e#f',
    '✓ café 東京',
    '\uD800',
    '\uDC00',
    'valid-😀-surrogate-pair',
    '%20+literal',
  ];

  for (const value of values) {
    const normalized = value
      .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '\uFFFD')
      .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '\uFFFD');
    const expectedRfc = encodeURIComponent(normalized).replace(/[!'()*]/g, character =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    const expectedForm = new URLSearchParams([['x', value]]).toString().slice(2);
    assert.equal(encodeComponent(value), expectedRfc, `RFC encoding: ${JSON.stringify(value)}`);
    assert.equal(encodeFormComponent(value), expectedForm, `form encoding: ${JSON.stringify(value)}`);
  }
});
