import { aligned, wordAt } from "@masseater.dev/lint-host";
import { Option } from "effect";

const WORD = 4;
const EMPTY = 0;
const NEXT = 1;
const STRING_WORDS = 2;
export const NONE = 4_294_967_295;
export const HEADER_WORDS = 8;
export const SEMANTIC_WORDS = 8;
export const CONCRETE_WORDS = 8;
export const ERROR_WORDS = 3;

export const HEADER = {
  version: 0,
  semanticCount: 1,
  semanticRoot: 2,
  concreteCount: 3,
  concreteRoot: 4,
  childCount: 5,
  errorCount: 6,
  stringCount: 7,
} as const;

export const SEMANTIC = {
  kind: 0,
  tag: 1,
  value: 2,
  style: 3,
  line: 4,
  column: 5,
  childStart: 6,
  childCount: 7,
} as const;

export const CONCRETE = {
  kind: 0,
  flags: 1,
  start: 2,
  end: 3,
  field: 4,
  parent: 5,
  childStart: 6,
  childCount: 7,
} as const;

export const FLAG = { named: 1, error: 2, missing: 4, extra: 8 } as const;

export interface SourceView {
  readonly semanticCount: number;
  readonly semanticRoot: Option.Option<number>;
  readonly concreteCount: number;
  readonly concreteRoot: Option.Option<number>;
  readonly errorCount: number;
  readonly semantic: (id: number, field: number) => number;
  readonly concrete: (id: number, field: number) => number;
  readonly child: (index: number) => number;
  readonly error: (index: number, field: number) => number;
  readonly stringAt: (index: number) => string;
  readonly text: string;
}

const utf16 = new TextDecoder("utf-16le");

const rootOf = (value: number): Option.Option<number> =>
  Option.liftPredicate(value, (id) => id !== NONE);

interface Layout {
  readonly semanticCount: number;
  readonly concreteCount: number;
  readonly errorCount: number;
  readonly semanticAt: number;
  readonly concreteAt: number;
  readonly childAt: number;
  readonly errorAt: number;
  readonly spanAt: number;
  readonly blobAt: number;
}

const layoutOf = (header: Uint32Array): Layout => {
  const semanticCount = wordAt(header)(HEADER.semanticCount);
  const concreteCount = wordAt(header)(HEADER.concreteCount);
  const errorCount = wordAt(header)(HEADER.errorCount);
  const semanticAt = HEADER_WORDS;
  const concreteAt = semanticAt + semanticCount * SEMANTIC_WORDS;
  const childAt = concreteAt + concreteCount * CONCRETE_WORDS;
  const errorAt = childAt + wordAt(header)(HEADER.childCount);
  const spanAt = errorAt + errorCount * ERROR_WORDS;
  const blobAt = (spanAt + wordAt(header)(HEADER.stringCount) * STRING_WORDS) * WORD;
  return {
    semanticCount,
    concreteCount,
    errorCount,
    semanticAt,
    concreteAt,
    childAt,
    errorAt,
    spanAt,
    blobAt,
  };
};

const stringsOf = (
  words: Uint32Array,
  blob: Uint8Array,
  spanAt: number,
): ((index: number) => string) => {
  const cache = new Map<number, string>();
  const decode = (index: number): string => {
    const offset = wordAt(words)(spanAt + index * STRING_WORDS) * STRING_WORDS;
    const length = wordAt(words)(spanAt + index * STRING_WORDS + NEXT) * STRING_WORDS;
    const value = utf16.decode(blob.subarray(offset, offset + length));
    cache.set(index, value);
    return value;
  };
  return (index) => Option.getOrElse(Option.fromNullishOr(cache.get(index)), () => decode(index));
};

export const sourceView = (raw: Uint8Array): SourceView => {
  const buffer = aligned(raw);
  const header = new Uint32Array(buffer.buffer, buffer.byteOffset, HEADER_WORDS);
  const layout = layoutOf(header);
  const words = new Uint32Array(buffer.buffer, buffer.byteOffset, layout.blobAt / WORD);
  const stringAt = stringsOf(words, buffer.subarray(layout.blobAt), layout.spanAt);
  return {
    semanticCount: layout.semanticCount,
    semanticRoot: rootOf(wordAt(header)(HEADER.semanticRoot)),
    concreteCount: layout.concreteCount,
    concreteRoot: rootOf(wordAt(header)(HEADER.concreteRoot)),
    errorCount: layout.errorCount,
    semantic: (id, field) => wordAt(words)(layout.semanticAt + id * SEMANTIC_WORDS + field),
    concrete: (id, field) => wordAt(words)(layout.concreteAt + id * CONCRETE_WORDS + field),
    child: (index) => wordAt(words)(layout.childAt + index),
    error: (index, field) => wordAt(words)(layout.errorAt + index * ERROR_WORDS + field),
    stringAt,
    text: stringAt(EMPTY),
  };
};
