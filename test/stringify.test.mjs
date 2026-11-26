import test from 'node:test';
import assert from 'node:assert/strict';
import { get, getAll, has, parse, pick, scan, stringify, stringifyForm } from '../dist/index.js';
import { decodeComponent, decodeComponentSpan, encodeComponent, encodeFormComponent } from '../dist/codec.js';

test('stringifies supported scalar values and arrays', () => {
  assert.equal(stringify({ a: 'hello world', b: 2, c: true, d: null, e: undefined, tags: ['rust', 'wasm'] }), 'a=hello%20world&b=2&c=true&d&tags=rust&tags=wasm');
  assert.equal(stringify({ b: 1, a: 2 }, { order: 'sorted' }), 'a=2&b=1');
  assert.equal(stringify({ tags: [null, 'x'] }), 'tags&tags=x');
  assert.equal(stringify({ tags: [undefined, 'x'] }), 'tags=x');
  assert.deepEqual(parse(stringify({ tags: [null, 'x'] })).tags, [null, 'x']);
  assert.equal(stringifyForm({ q: 'a b' }), 'q=a+b');
  assert.equal(stringify({ q: '\uD800' }), 'q=%EF%BF%BD');
});


test('uses RFC 3986 escaping and WHATWG form encoding', () => {
  const input = { value: "!'()* ~" };
  assert.equal(stringify(input), 'value=%21%27%28%29%2A%20~');
  assert.equal(stringifyForm(input), new URLSearchParams(input).toString());
  assert.equal(stringifyForm(input), 'value=%21%27%28%29*+%7E');
});


test('form serialization matches WHATWG punctuation, spaces, and Unicode', () => {
  const input = {
    punctuation: "!'()*~",
    spaces: 'one two three',
    unicode: '✓ café 東京',
    reserved: 'a&b=c/d?e#f',
  };
  assert.equal(stringifyForm(input), new URLSearchParams(input).toString());
});


test('rejects non-finite numbers and unsupported objects', () => {
  assert.throws(() => stringify({ n: Number.NaN }), TypeError);
  assert.throws(() => stringify({ x: { y: 1 } }), TypeError);
});


test('stringifier preserves filtering, encoding, and array semantics', () => {
  const input = {
    omitted: undefined,
    nullValue: null,
    empty: '',
    values: [undefined, null, '', 'a b', 0, false, 12n],
  };
  assert.equal(
    stringify(input),
    'nullValue&empty=&values&values=&values=a%20b&values=0&values=false&values=12',
  );
  assert.equal(
    stringify(input, { skipNull: true, skipEmptyString: true }),
    'values=a%20b&values=0&values=false&values=12',
  );
  assert.equal(stringify({ b: 'two words', a: 'x' }, { encode: false, order: 'sorted' }), 'a=x&b=two words');
  assert.equal(stringifyForm({ values: [undefined, null, 'a b'] }), 'values&values=a+b');
});


test('stringifies large flat records without changing ordering or separators', () => {
  const input = Object.fromEntries(Array.from({ length: 15000 }, (_, index) => [`k${index}`, `v${index}`]));
  const output = stringify(input);
  assert.equal(output.split('&').length, 15000);
  assert.ok(output.startsWith('k0=v0&k1=v1&'));
  assert.ok(output.endsWith('k14999=v14999'));
});
