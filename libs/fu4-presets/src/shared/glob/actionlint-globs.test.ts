import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import {
  Array as Arr,
  Effect,
  FileSystem,
  ManagedRuntime,
  Path,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { afterAll, expect, test } from "vite-plus/test";

import { validatePath, validateRef } from "./index.ts";
import type { InvalidGlob } from "./index.ts";

const FIXTURE = "fixtures/actionlint/globs.json";
const KNOWN = "fixtures/actionlint/globs-known-failures.txt";
const REF = "ref";

const InvalidSchema = Schema.Struct({ message: Schema.String, column: Schema.Int });

const GlobSchema = Schema.Struct({
  id: Schema.String,
  glob: Schema.Literals(["ref", "path"]),
  pattern: Schema.String,
  errors: Schema.Array(InvalidSchema),
});

type Glob = typeof GlobSchema.Type;

const Recorded = GlobSchema.pipe(Schema.Array, Schema.fromJsonString);

interface Outcome {
  readonly id: string;
  readonly want: readonly string[];
  readonly have: readonly string[];
}

const keysOf = (errors: readonly InvalidGlob[]): readonly string[] =>
  pipe(
    errors,
    Arr.map(({ message, column }) => `${String(column)}: ${message}`),
  );

const validated = (glob: Glob): readonly InvalidGlob[] => {
  if (glob.glob === REF) {
    return validateRef(glob.pattern);
  }
  return validatePath(glob.pattern);
};

const outcomeOf = (glob: Glob): Outcome => ({
  id: glob.id,
  want: keysOf(glob.errors),
  have: keysOf(validated(glob)),
});

const differs = (outcome: Outcome): boolean =>
  !Arr.makeEquivalence(Str.Equivalence)(outcome.want, outcome.have);

const knownIds = (text: string): readonly string[] =>
  pipe(
    Str.split("\n")(text),
    Arr.map((line) => Str.trim(Arr.headNonEmpty(Str.split(" #")(line)))),
    Arr.filter(Str.isNonEmpty),
  );

const here = Effect.gen(function* here() {
  const path = yield* Path.Path;
  const file = yield* path.fromFileUrl(new URL(import.meta.url));
  return path.dirname(file);
});

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

test("validates every glob actionlint's tests validate as actionlint does", () =>
  Effect.gen(function* validatesEveryGlob() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const dir = yield* here;
    const text = yield* fileSystem.readFileString(path.join(dir, FIXTURE));
    const globs = yield* Schema.decodeEffect(Recorded)(text);
    const knownText = yield* fileSystem.readFileString(path.join(dir, KNOWN));
    const known = knownIds(knownText);
    const outcomes = pipe(globs, Arr.map(outcomeOf));
    const failing = pipe(outcomes, Arr.filter(differs));
    expect({
      unexpected: pipe(
        failing,
        Arr.filter((outcome) => !Arr.contains(known, outcome.id)),
      ),
      fixed: pipe(
        known,
        Arr.filter(
          (id) =>
            !pipe(
              failing,
              Arr.some((outcome) => outcome.id === id),
            ),
        ),
      ),
    }).toStrictEqual({ unexpected: [], fixed: [] });
  }).pipe(services.runPromise));
