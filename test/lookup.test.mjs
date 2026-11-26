import test from 'node:test';
import assert from 'node:assert/strict';
import { get, getAll, has, parse, pick, scan, stringify, stringifyForm } from '../dist/index.js';
import { decodeComponent, decodeComponentSpan, encodeComponent, encodeFormComponent } from '../dist/codec.js';

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


test('pick handles a single requested key without decoding unrelated keys', () => {
  assert.deepEqual(pick('?a%20b=1&x=first&x=second&flag', ['x']), Object.assign(Object.create(null), { x: ['first', 'second'] }));
  assert.deepEqual(pick('?a=1', ['missing']), Object.create(null));
  assert.throws(() => pick('?x=1&bad%ZZ=2', ['x'], 'throw'), URIError);
  assert.throws(() => pick('?bad%ZZ=2', ['missing'], 'throw'), URIError);
});
