/** Supported malformed-component decoding policies. */
export const DECODE_MODES = Object.freeze(['throw', 'replace', 'preserve'] as const);

/** Supported duplicate-key policies when parsing a query string. */
export const DUPLICATE_MODES = Object.freeze(['combine', 'first', 'last'] as const);

/** Supported key ordering policies when serializing a query record. */
export const QUERY_ORDERS = Object.freeze(['insertion', 'sorted'] as const);
