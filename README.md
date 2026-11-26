# QueryX

A fast, dependency-free query-string parser, serializer and selective lookup library for JavaScript and TypeScript.

```sh
npm install @weluvabid/queryx
```

## Try QueryX

- **[Run the complete API example on StackBlitz](https://stackblitz.com/edit/queryx?file=index.js)** — a runnable Vanilla Node.js example covering parsing, selective lookup, scanning, decoding modes, serialization, and edge cases.
- **[Parsing & Lookup benchmarks](https://bencher.dev/perf/queryx?branches=01a217cf-c51e-7790-8a10-603f75f50b83&testbeds=01a217cf-c51e-7790-8a10-6041ebea368e&benchmarks=01a217cf-c526-7338-9ba9-67f709240fed,01a217cf-c521-7352-8ba9-5863caa7f637,01a217cf-c523-75bd-b504-469bcda8c027,01a217cf-c523-75bd-b504-46982fd01e2a,01a217cf-c520-70ce-9d4b-a5c5362ab2a1,01a217cf-c522-7779-a213-a21743d6c04c&measures=01a217cf-c520-70ce-9d4b-a5c1096b40b4,01a217cf-c520-70ce-9d4b-a5c0d0338549&layout=stacked)** — interactive latency and throughput history.
- **[Serialization benchmarks](https://bencher.dev/perf/queryx?branches=01a217cf-c51e-7790-8a10-603f75f50b83&testbeds=01a217cf-c51e-7790-8a10-6041ebea368e&benchmarks=01a217cf-c524-72d6-9c12-28689d321ec7,01a217cf-c527-746c-bb67-e0fb6d249758,01a217cf-c525-70b3-8b98-7cdc540d0a4c,01a217cf-c525-70b3-8b98-7cd6e86067d2,01a217cf-c527-746c-bb67-e0f8b8b25151,01a217cf-c524-72d6-9c12-286bfd206938&measures=01a217cf-c520-70ce-9d4b-a5c1096b40b4,01a217cf-c520-70ce-9d4b-a5c0d0338549&metrics=value&layout=stacked)** — interactive latency and throughput history.

## Why QueryX

QueryX is built for fast query-string handling without parsing more than you need.

- Parse query strings into null-prototype objects.
- Read individual values directly from the original query string.
- Select only the keys an operation needs with `pick()`.
- Iterate lazily over raw query spans with `scan()`.
- Serialize with RFC 3986 component encoding or WHATWG form encoding.
- Control duplicate-key handling and malformed percent-encoding behavior.

## Quick start

```ts
import { get, getAll, has, parse, pick, scan, stringify, stringifyForm } from '@weluvabid/queryx';

const query = '?page=2&tag=rust&tag=wasm&flag';

const parsed = parse(query);
// Null-prototype object:
// { page: '2', tag: ['rust', 'wasm'], flag: null }

get(query, 'page'); // '2'
getAll(query, 'tag'); // ['rust', 'wasm']
has(query, 'flag'); // true
pick(query, ['page', 'tag']); // only the selected keys

for (const entry of scan(query)) {
  // Offsets refer to entry.source. Decoding is lazy.
  console.log(entry.keyStart, entry.keyEnd, entry.decode());
}

stringify({ page: 2, tag: ['rust', 'wasm'], flag: null });
// 'page=2&tag=rust&tag=wasm&flag'

stringifyForm({ search: 'café 東京', punctuation: "!'()*~" });
// 'search=caf%C3%A9+%E6%9D%B1%E4%BA%AC&punctuation=%21%27%28%29*%7E'
```

## API

### Parsing

```ts
parse(search, options?)
```

Parses a query string into a null-prototype object. Duplicate keys are combined into arrays by default.

```ts
parse('?tag=rust&tag=wasm', { duplicates: 'combine' });
parse('?tag=rust&tag=wasm', { duplicates: 'first' });
parse('?tag=rust&tag=wasm', { duplicates: 'last' });
```

### Selective lookup

```ts
get(search, key);
getAll(search, key);
has(search, key);
pick(search, keys);
```

These operations inspect the query string directly and decode the values they need.

- `get()` returns the first matching value, `null` for a valueless parameter and `undefined` when absent.
- `getAll()` returns every matching value.
- `has()` checks whether a key is present.
- `pick()` returns an object containing only the requested keys.

### Scanning

```ts
scan(search);
```

Returns a lazy iterable of entries. Each entry exposes source offsets and `decode()`, `decodeKey()` and `decodeValue()` methods, allowing callers to work with raw spans and defer decoding.

### Serialization

```ts
stringify(data, options?)
stringifyForm(data, options?)
```

`stringify()` uses RFC 3986 component encoding by default. `stringifyForm()` uses WHATWG `application/x-www-form-urlencoded` encoding and matches `URLSearchParams` form serialization.

Both serializers support insertion or sorted key order, repeated keys for arrays, and options for skipping null or empty-string values.

```ts
stringify({ page: 2, tag: ['rust', 'wasm'], flag: null });

stringify({ tag: ['wasm', 'rust'] }, { order: 'sorted' });

stringifyForm({ search: 'one two', symbol: '*~' });
// 'search=one+two&symbol=*%7E'
```

## Options and constants

QueryX exports the supported option values as immutable constants, with TypeScript types derived from them.

```ts
import { DECODE_MODES, DUPLICATE_MODES, QUERY_ORDERS } from '@weluvabid/queryx';

DECODE_MODES; // ['throw', 'replace', 'preserve']
DUPLICATE_MODES; // ['combine', 'first', 'last']
QUERY_ORDERS; // ['insertion', 'sorted']
```

| Option       | Values                         | Default     |
| ------------ | ------------------------------ | ----------- |
| `decode`     | `throw`, `replace`, `preserve` | `replace`   |
| `duplicates` | `combine`, `first`, `last`     | `combine`   |
| `order`      | `insertion`, `sorted`          | `insertion` |

`stringify()` also supports `encode`, `skipNull` and `skipEmptyString`.

## Semantics

- A leading `?` is ignored. Scanning stops at the first `#` fragment marker.
- Empty segments between `&` separators are ignored; an empty key (`=value`) is retained.
- `+` decodes to a space. Percent-encoded bytes are decoded as UTF-8.
- A key without `=` has value `null`; `key=` has value `''`.
- Duplicate keys become arrays by default. The `first` and `last` policies are also available.
- Parsed objects have a null prototype, so keys such as `__proto__` are ordinary data.
- Malformed decoding uses replacement behavior by default. `decode: 'throw'` enables strict errors; `decode: 'preserve'` retains malformed component text.
- `stringify()` uses RFC 3986 component encoding, preserves insertion order by default, emits repeated keys for arrays and emits `key` for `null` values.
- `undefined` values are omitted.
- Non-finite numbers and nested objects are rejected rather than implicitly coerced.

## Performance

Node.js v26.13.0 · 100 parameters · 100,000 iterations per sample · 7 samples · median latency.

| Operation         |       QueryX | URLSearchParams | query-string |
| ----------------- | -----------: | --------------: | -----------: |
| Parse into object | **17.69 µs** |        17.69 µs |     41.54 µs |
| Stringify         | **13.96 µs** |        12.29 µs |     29.75 µs |

QueryX parsed the benchmark query in the same time as the native `URLSearchParams` conversion and was 2.35× faster than `query-string`. Serialization was 2.13× faster than `query-string`.

### Selective lookup

| Operation                        | Median latency |
| -------------------------------- | -------------: |
| QueryX `get()` (last of 100)     |    **2.18 µs** |
| QueryX `pick()` (1 of 100)       |    **3.12 µs** |
| QueryX `pick()` (3 of 100)       |    **7.06 µs** |
| QueryX `pick()` (all 100)        |   **20.65 µs** |
| URLSearchParams parse + get      |       12.81 µs |
| URLSearchParams get (pre-parsed) |        0.22 µs |

QueryX `get()` was 5.9× faster than parsing the query with `URLSearchParams` and then retrieving a value.

### Additional operations

| Operation                      | Median latency |
| ------------------------------ | -------------: |
| QueryX scan (100 entries)      |        3.32 µs |
| QueryX `stringifyForm()`       |       14.98 µs |
| URLSearchParams form stringify |       12.29 µs |

The benchmark also covers reserved-heavy and mixed serialization inputs, component encoding, span decoding and slice decoding.

## Development

```sh
npm install
npm test
npm run bench
```

The benchmark compares QueryX with native `URLSearchParams` and optionally with `query-string`. It rotates benchmark order between samples and reports median latency after warmup. Form serialization is checked against `URLSearchParams`.

Install `query-string` to include its comparison:

```sh
npm install --no-save query-string
```

Configure benchmark runs with `ITERATIONS`, `SAMPLES` (minimum 3) and `WARMUP`.

### Continuous benchmarking with Bencher

QueryX exports its existing benchmark results in [Bencher Metric Format](https://bencher.dev/docs/reference/bencher-metric-format/). Each benchmark reports:

- **Latency:** median time per operation, recorded in nanoseconds.
- **Throughput:** operations per second, calculated from the same measured sample.

The reported value is the median across the configured samples. The benchmark workload, warmup, iteration count, and terminal output remain the same.

Run the exporter locally:

```sh
npm run bench:bencher
```

## License

MIT
