import { performance } from 'node:perf_hooks';
import { URLSearchParams } from 'node:url';
import { get, parse, pick, scan, stringify, stringifyForm } from '../dist/index.js';
import { decodeComponent, decodeComponentSpan, encodeComponent, encodeFormComponent } from '../dist/codec.js';

const query = Array.from({ length: 100 }, (_, i) => `key${i}=value%20${i}`).join('&');
const allKeys = Array.from({ length: 100 }, (_, i) => `key${i}`);
const object = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`key${i}`, `value ${i}`]));
const specialObject = {
  punctuation: "!'()*~",
  spaces: 'one two three',
  unicode: '✓ café 東京',
  reserved: 'a&b=c/d?e#f',
};
const reservedObject = Object.fromEntries(
  Array.from({ length: 100 }, (_, i) => [`key!${i}()*`, `!value!${i}()*&=/`]),
);
const mixedObject = Object.fromEntries(
  Array.from({ length: 100 }, (_, i) => [
    `key${i}${i % 4 === 0 ? ' !()*' : ''}`,
    i % 4 === 0 ? `reserved !()* &=${i}` : i % 4 === 1 ? `spaces value ${i}` : i % 4 === 2 ? `unicode ✓ café ${i}` : `plain-${i}`,
  ]),
);
const iterations = Number(process.env.ITERATIONS ?? 100_000);
const samplesCount = Number(process.env.SAMPLES ?? 5);
const warmupIterations = Number(process.env.WARMUP ?? 2_000);

for (const [name, value, minimum] of [
  ['ITERATIONS', iterations, 1],
  ['SAMPLES', samplesCount, 3],
  ['WARMUP', warmupIterations, 0],
]) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new TypeError(`${name} must be a safe integer >= ${minimum}`);
  }
}

let queryString;
try {
  const imported = await import('query-string');
  const candidate = typeof imported.parse === 'function' ? imported : imported.default;
  if (typeof candidate?.parse === 'function' && typeof candidate?.stringify === 'function') {
    queryString = candidate;
  } else {
    console.warn('query-string is installed but exposes an unsupported module shape; skipping it.');
  }
} catch (error) {
  if (error?.code !== 'ERR_MODULE_NOT_FOUND' && error?.code !== 'MODULE_NOT_FOUND') throw error;
  console.warn('query-string is not installed; skipping its optional comparison.');
}

function parseNative(input) {
  const result = Object.create(null);
  for (const [key, value] of new URLSearchParams(input)) {
    if (!Object.hasOwn(result, key)) result[key] = value;
    else if (Array.isArray(result[key])) result[key].push(value);
    else result[key] = [result[key], value];
  }
  return result;
}

// Consume each measured result once per sample. This keeps results observable
// without putting a checksum operation into every timed iteration.
let blackhole = 0;
function consume(value) {
  if (typeof value === 'string') {
    blackhole = (blackhole + value.length + (value.charCodeAt(0) || 0)) | 0;
  } else if (value && typeof value === 'object') {
    blackhole = (blackhole + Object.keys(value).length) | 0;
  } else {
    blackhole = (blackhole + Number(value ?? 0)) | 0;
  }
}

const nativeParams = new URLSearchParams(query);
const valueStart = query.indexOf('=') + 1;
const valueEnd = query.indexOf('&');

const benchmarks = [
  ['QueryX parse', () => parse(query)],
  ['URLSearchParams -> object', () => parseNative(query)],
  ['QueryX selective get (last)', () => get(query, 'key99')],
  ['QueryX pick (1 of 100)', () => pick(query, ['key99'])],
  ['QueryX pick (3 of 100)', () => pick(query, ['key10', 'key50', 'key99'])],
  ['QueryX pick (all 100)', () => pick(query, allKeys)],
  ['QueryX scan (100 entries)', () => {
    let count = 0;
    for (const entry of scan(query)) count += entry.keyEnd - entry.keyStart;
    return count;
  }],
  ['URLSearchParams parse + get', () => new URLSearchParams(query).get('key99')],
  ['URLSearchParams get (pre-parsed)', () => nativeParams.get('key99')],
  ['QueryX stringify (RFC 3986)', () => stringify(object)],
  ['QueryX stringify (reserved-heavy)', () => stringify(reservedObject)],
  ['QueryX stringify (mixed)', () => stringify(mixedObject)],
  ['QueryX stringifyForm', () => stringifyForm(object)],
  ['QueryX stringifyForm (mixed)', () => stringifyForm(mixedObject)],
  ['URLSearchParams stringify', () => new URLSearchParams(object).toString()],
  ['decode span (encoded)', () => decodeComponentSpan(query, valueStart, valueEnd)],
  ['decode slice (encoded)', () => decodeComponent(query.slice(valueStart, valueEnd))],
  ['encodeComponent (safe ASCII)', () => encodeComponent('keyName_99-~')],
  ['encodeComponent (ASCII)', () => encodeComponent('value with spaces')],
  ['encodeComponent (reserved)', () => encodeComponent("!'()*~&=/?#")],
  ['encodeComponent (repeated reserved)', () => encodeComponent("!'()*~&=/?#".repeat(8))],
  ['encodeComponent (Unicode)', () => encodeComponent('✓ café 東京')],
  ['encodeFormComponent (no spaces)', () => encodeFormComponent('value-without-spaces')],
  ['encodeFormComponent (spaces)', () => encodeFormComponent('value with spaces')],
  ['encodeFormComponent (reserved)', () => encodeFormComponent("!'()*~&=/?#")],
  ['encodeFormComponent (mixed)', () => encodeFormComponent("key with spaces & punctuation !()* café 東京")],
];


if (queryString) {
  benchmarks.push(
    ['query-string parse', () => queryString.parse(query)],
    ['query-string stringify', () => queryString.stringify(object)],
  );
}

// Validate equivalent simple-input parsing before measuring.
const queryxParsed = parse(query);
const nativeParsed = parseNative(query);
if (JSON.stringify(Object.keys(queryxParsed)) !== JSON.stringify(Object.keys(nativeParsed))) {
  throw new Error('QueryX and URLSearchParams parse benchmarks produced different keys');
}
for (const key of Object.keys(queryxParsed)) {
  if (queryxParsed[key] !== nativeParsed[key]) {
    throw new Error(`Parse benchmark mismatch for ${key}`);
  }
}

const expectedRfc3986 = Object.entries(object).map(([key, value]) =>
  `${encodeURIComponent(key).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}=` +
  `${encodeURIComponent(value).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`,
).join('&');
if (stringify(object) !== expectedRfc3986) {
  throw new Error('QueryX RFC 3986 stringify benchmark produced unexpected output');
}

// Form encoding is specified to match WHATWG URLSearchParams exactly.
const queryxForm = stringifyForm(specialObject);
const nativeForm = new URLSearchParams(specialObject).toString();
if (queryxForm !== nativeForm) {
  throw new Error(
    `Form encoding mismatch\\n  QueryX:          ${queryxForm}\\n  URLSearchParams: ${nativeForm}`,
  );
}
console.log('Form encoding matches WHATWG URLSearchParams: yes');

console.log(
  `Node ${process.version}; ${iterations.toLocaleString()} iterations/sample; ` +
  `${samplesCount} samples; 100 parameters`,
);
console.log('Samples are run in rotating benchmark order; reported value is the median.');
for (const [, fn] of benchmarks) {
  for (let i = 0; i < warmupIterations; i++) fn();
}

const timings = benchmarks.map(([name]) => [name, []]);
for (let sample = 0; sample < samplesCount; sample++) {
  // Rotate order between samples to reduce systematic first/last benchmark bias.
  const offset = sample % benchmarks.length;
  for (let index = 0; index < benchmarks.length; index++) {
    const benchmarkIndex = (index + offset) % benchmarks.length;
    const [name, fn] = benchmarks[benchmarkIndex];
    let result;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) result = fn();
    const elapsed = performance.now() - start;
    consume(result);
    timings[benchmarkIndex][1].push(elapsed);
  }
}

for (const [name, samples] of timings) {
  samples.sort((a, b) => a - b);
  const elapsed = samples[Math.floor(samples.length / 2)];
  console.log(
    `${name.padEnd(38)} ${(iterations / elapsed * 1000).toFixed(0).padStart(10)} ops/s  ` +
    `${(elapsed / iterations * 1000).toFixed(2)} µs/op`,
  );
}
console.log(`Benchmark sink: ${blackhole}`);
