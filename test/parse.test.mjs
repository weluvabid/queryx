import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../dist/index.js';

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

test('decoding modes are explicit', () => {
  assert.equal(parse('?x=%ZZ').x, '%ZZ');
  assert.equal(parse('?x=%ZZ', { decode: 'preserve' }).x, '%ZZ');
  assert.throws(() => parse('?x=%ZZ', { decode: 'throw' }), URIError);
});

test('handles Unicode and plus signs', () => {
  assert.equal(parse('?q=%E2%9C%93+ok').q, '✓ ok');
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
