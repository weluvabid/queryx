export type DecodeMode = 'throw' | 'replace' | 'preserve';

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
  readonly duplicates?: 'combine' | 'first' | 'last';
}

export interface StringifyOptions {
  readonly order?: 'insertion' | 'sorted';
  readonly encode?: boolean;
  readonly skipNull?: boolean;
  readonly skipEmptyString?: boolean;
}

export type QueryValue = string | number | bigint | boolean | null | undefined | readonly (string | number | bigint | boolean | null | undefined)[];
export type QueryRecord = Readonly<Record<string, QueryValue>>;
