import type { DECODE_MODES, DUPLICATE_MODES, QUERY_ORDERS } from './constants.js';

export type DecodeMode = typeof DECODE_MODES[number];
export type DuplicateMode = typeof DUPLICATE_MODES[number];
export type QueryOrder = typeof QUERY_ORDERS[number];

export interface ScanEntry {
  readonly source: string;
  readonly keyStart: number;
  readonly keyEnd: number;
  readonly valueStart: number;
  readonly valueEnd: number;
  readonly hasEquals: boolean;
  readonly decode: (mode?: DecodeMode) => { key: string; value: string | null };
  readonly decodeKey: (mode?: DecodeMode) => string;
  readonly decodeValue: (mode?: DecodeMode) => string | null;
}

export interface ParseOptions {
  readonly decode?: DecodeMode;
  readonly duplicates?: DuplicateMode;
}

export interface StringifyOptions {
  readonly order?: QueryOrder;
  readonly encode?: boolean;
  readonly skipNull?: boolean;
  readonly skipEmptyString?: boolean;
}

export type QueryValue = string | number | bigint | boolean | null | undefined | readonly (string | number | bigint | boolean | null | undefined)[];
export type QueryRecord = Readonly<Record<string, QueryValue>>;
