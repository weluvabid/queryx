# Queryx

A small, dependency-free query-string parser and serializer for JavaScript and TypeScript.

## Install

```sh
npm install @weluvabid/queryx
```

## API

```ts
import { parse, stringify, get, getAll, has, pick, scan } from '@weluvabid/queryx';

const query = '?page=2&tag=rust&tag=wasm&flag';

parse(query);                 // null-prototype object; duplicates become arrays
get(query, 'page');            // '2' (first matching value)
getAll(query, 'tag');          // ['rust', 'wasm']
has(query, 'flag');            // true
pick(query, ['page', 'tag']);  // only selected keys

for (const entry of scan(query)) {
  // Raw offsets refer to entry.source. Decoding is deferred.
  console.log(entry.keyStart, entry.keyEnd, entry.decode());
}

stringify({ page: 2, tag: ['rust', 'wasm'], flag: null });
```

## Semantics

- A leading `?` is ignored. Scanning stops at the first `#` fragment marker.
- Empty segments between `&` separators are ignored; an empty key (`=value`) is retained.
- `+` decodes to a space. Percent-encoded bytes are decoded as UTF-8.
- A key without `=` has value `null`; `key=` has value `''`.
- Duplicate keys become arrays by default. `duplicates: 'first'` and `'last'` are available.
- Parsed dictionaries have a null prototype, so keys such as `__proto__` are ordinary data.
- Malformed decoding defaults to replacement/recovery behavior. `decode: 'throw'` opts into strict errors; `decode: 'preserve'` retains malformed component text.
- `get()` returns the first matching value, `null` for a valueless parameter, and `undefined` when absent.
- `stringify()` uses RFC 3986 component encoding, insertion order by default, repeated keys for arrays, and emits `key` for `null` values. `undefined` values are omitted.
- Non-finite numbers and nested objects are rejected rather than implicitly coerced.

## Options

```ts
parse(search, { decode: 'replace', duplicates: 'combine' });
stringify(data, { order: 'sorted' });
```

Arrays use repeated keys, matching the parser's duplicate-key representation. `stringifyForm()` uses QueryX's RFC 3986 component escaping with `+` for spaces. It is not byte-for-byte equivalent to WHATWG `URLSearchParams` form encoding for every reserved character.

## Development

```sh
npm install
npm test
npm run bench
```

Benchmarks compare representative operations with native `URLSearchParams`, isolate component-encoder costs, rotate benchmark order between samples, and report the median after warmup. The harness also reports whether `stringifyForm()` matches WHATWG form serialization for a reserved-character corpus; the two encodings are not currently identical. The optional `query-string` comparison supports named and default-wrapped module exports; install it with `npm install --no-save query-string` to include it. Configure runs with `ITERATIONS`, `SAMPLES` (minimum 3), and `WARMUP`. Benchmark results are runtime- and machine-dependent.

## License

MIT
