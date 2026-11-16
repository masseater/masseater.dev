import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Array as Arr, Effect, FileSystem, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";

const WORDNET_VERBS = new URL(import.meta.resolve("wordnet-db/dict/index.verb"));
const WORD = /^[a-z]+$/u;
const FIELD_SEPARATOR = " ";
const INDENT = 2;

const verbListOf = (index: string): string =>
  pipe(
    Str.split(index, "\n"),
    Arr.filter((line) => !Str.startsWith(FIELD_SEPARATOR)(line)),
    Arr.flatMap((line) => Arr.fromOption(Arr.head(Str.split(line, FIELD_SEPARATOR)))),
    Arr.filter((lemma) => WORD.test(lemma)),
    Arr.dedupe,
    (verbs) => Arr.sort(verbs, Str.Order),
    (verbs) => `${JSON.stringify(verbs, null, INDENT)}\n`,
  );

const matchesWordnet = Effect.gen(function* matchesWordnet() {
  const fs = yield* FileSystem.FileSystem;
  const index = yield* fs.readFileString(WORDNET_VERBS.pathname);
  yield* Effect.promise(() =>
    expect(verbListOf(index)).toMatchFileSnapshot("./english-verbs.json"),
  );
});

layer(nodeServicesLayer)("english-verbs.json", (it) => {
  it.effect("holds the single-word verbs of WordNet", () => matchesWordnet);
});
