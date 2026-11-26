import test from 'node:test';
import assert from 'node:assert/strict';
import { get, getAll, has, parse, pick, scan, stringify, stringifyForm } from '../dist/index.js';
import { decodeComponent, decodeComponentSpan, encodeComponent, encodeFormComponent } from '../dist/codec.js';

test('parses ordinary, empty, duplicate, and valueless parameters', () => {
  const result = parse('?a=1&a=2&empty=&flag&=blank&&x=3#fragment');
  assert.equal(result.a[0], '1');
  assert.deepEqual(result.a, ['1', '2']);
  assert.equal(result.empty, '');
  assert.equal(result.flag, null);
  assert.equal(result[''], 'blank');
  assert.equal(result.x, '3');
});

test('returns null-prototype dictionaries and safely handles dangerous keys', () => {
  const result = parse('?__proto__=x&constructor=y&toString=z');
  assert.equal(Object.getPrototypeOf(result), null);
  assert.equal(result.__proto__, 'x');
  assert.equal(result.constructor, 'y');
});

test('supports duplicate policies', () => {
  assert.equal(parse('?x=1&x=2', { duplicates: 'first' }).x, '1');
  assert.equal(parse('?x=1&x=2', { duplicates: 'last' }).x, '2');
});

test('selective operations preserve duplicate and missing distinctions', () => {
  const query = '?x=1&flag&x=2';
  assert.equal(get(query, 'x'), '1');
  assert.equal(get(query, 'missing'), undefined);
  assert.equal(get(query, 'flag'), null);
  assert.throws(() => get('x=1&bad%ZZ=y', 'missing', 'throw'), URIError);
  assert.equal(has(query, 'flag'), true);
  assert.equal(has(query, 'missing'), false);
  assert.deepEqual(getAll(query, 'x'), ['1', '2']);
  assert.deepEqual(pick(query, ['x']), Object.assign(Object.create(null), { x: ['1', '2'] }));
});

test('scan exposes raw spans and defers decoding', () => {
  const [entry] = [...scan('?a%20b=c+d')];
  assert.equal(entry.source.slice(entry.keyStart, entry.keyEnd), 'a%20b');
  assert.equal(entry.decodeKey(), 'a b');
  assert.equal(entry.decodeValue(), 'c d');
});

test('decoding modes are explicit', () => {
  assert.equal(parse('?x=%ZZ').x, '%ZZ');
  assert.equal(parse('?x=%ZZ', { decode: 'preserve' }).x, '%ZZ');
  assert.throws(() => parse('?x=%ZZ', { decode: 'throw' }), URIError);
});

test('handles Unicode and plus signs', () => {
  assert.equal(parse('?q=%E2%9C%93+ok').q, '✓ ok');
});

test('stringifies supported scalar values and arrays', () => {
  assert.equal(stringify({ a: 'hello world', b: 2, c: true, d: null, e: undefined, tags: ['rust', 'wasm'] }), 'a=hello%20world&b=2&c=true&d&tags=rust&tags=wasm');
  assert.equal(stringify({ b: 1, a: 2 }, { order: 'sorted' }), 'a=2&b=1');
  assert.equal(stringify({ tags: [null, 'x'] }), 'tags&tags=x');
  assert.equal(stringify({ tags: [undefined, 'x'] }), 'tags=x');
  assert.deepEqual(parse(stringify({ tags: [null, 'x'] })).tags, [null, 'x']);
  assert.equal(stringifyForm({ q: 'a b' }), 'q=a+b');
  assert.equal(stringify({ q: '\uD800' }), 'q=%EF%BF%BD');
});

test('uses RFC 3986 escaping and form-space encoding consistently', () => {
  assert.equal(stringify({ value: "!'()* ~" }), 'value=%21%27%28%29%2A%20~');
  assert.equal(stringifyForm({ value: "!'()* ~" }), 'value=%21%27%28%29%2A+~');
});

test('form serialization uses plus for spaces and RFC 3986 escaping for reserved characters', () => {
  const input = { value: "!'()*~ a" };
  assert.equal(stringifyForm(input), 'value=%21%27%28%29%2A~+a');
  assert.notEqual(stringifyForm(input), new URLSearchParams(input).toString());
});

test('rejects non-finite numbers and unsupported objects', () => {
  assert.throws(() => stringify({ n: Number.NaN }), TypeError);
  assert.throws(() => stringify({ x: { y: 1 } }), TypeError);
});

test('handles long flat input iteratively', () => {
  const query = Array.from({ length: 15000 }, (_, i) => `k${i}=v${i}`).join('&');
  assert.equal([...scan(query)].length, 15000);
  assert.equal(get(query, 'k14999'), 'v14999');
});

test('empty input and fragments', () => {
  assert.deepEqual(parse(''), Object.create(null));
  assert.deepEqual(parse('#only-fragment'), Object.create(null));
  assert.equal(parse('?a=1#x&b=2').b, undefined);
});

test('preserve mode decodes valid runs around malformed escapes', () => {
  assert.equal(parse('?x=hello%20%ZZ%20world', { decode: 'preserve' }).x, 'hello %ZZ world');
  assert.equal(parse('?x=%E0%A4%A', { decode: 'preserve' }).x, '%E0%A4%A');
  assert.equal(parse('?x=%E0%A4%A').x, '�%A');
});

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
    const expectedForm = expectedRfc.replace(/%20/g, '+');
    assert.equal(encodeComponent(value), expectedRfc, `RFC encoding: ${JSON.stringify(value)}`);
    assert.equal(encodeFormComponent(value), expectedForm, `form encoding: ${JSON.stringify(value)}`);
  }
});
