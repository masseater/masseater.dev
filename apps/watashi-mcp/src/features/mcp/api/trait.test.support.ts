import { makeD1 } from "@masseater.dev/d1-test";
import { Array as Arr, Option, String as Str, pipe } from "effect";

const {
  closeDatabase,
  env: database,
  resetDatabase,
} = makeD1({
  migrations: new URL("../../../../drizzle/", import.meta.url).href,
  tables: [
    "life_record",
    "memory",
    "revision",
    "owner_trait",
    "owner_trait_evidence",
    "owner_trait_vector",
    "trait_cursor",
    "conversation_chunk",
    "conversation_session",
  ],
});

type Embedded = Readonly<{ data: number[][]; shape: number[] }>;

const DIMENSIONS = 64;

const transcripts = new Map<string, string>();

const embeddedTexts: string[] = [];

const gzipped = (text: string): ReadableStream<Uint8Array> =>
  new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));

const FIRST = 0;

const slotsOf = (text: string): readonly number[] =>
  pipe(
    Arr.fromIterable(text),
    Arr.flatMap((char) => pipe(char, Str.codePointAt(FIRST), Option.toArray)),
    Arr.map((code) => code % DIMENSIONS),
  );

const vectorOf = (text: string): number[] => {
  const slots = slotsOf(text);
  return Arr.makeBy(
    DIMENSIONS,
    (slot) =>
      pipe(
        slots,
        Arr.filter((filled) => filled === slot),
      ).length,
  );
};

type Stored = Readonly<{ body: ReadableStream<Uint8Array> }>;

const storedAt = (key: string): Stored | null =>
  pipe(
    Option.fromUndefinedOr(transcripts.get(key)),
    Option.map((text) => ({ body: gzipped(text) })),
    Option.getOrNull,
  );

const CONVERSATIONS = {
  get: (key: string): Promise<Stored | null> => Promise.resolve(storedAt(key)),
};

const AI = {
  run: (_model: string, input: Readonly<{ text: readonly string[] }>): Promise<Embedded> => {
    embeddedTexts.push(...input.text);
    const data = pipe(input.text, Arr.map(vectorOf));
    return Promise.resolve({ data, shape: [data.length, DIMENSIONS] });
  },
};

const env = { ...database, CONVERSATIONS, AI };

export { closeDatabase, embeddedTexts, env, resetDatabase, transcripts };
