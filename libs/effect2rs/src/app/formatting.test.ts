import { NodeServices } from "@effect/platform-node";
import { expect, layer } from "@effect/vitest";
import { Effect, Record, Schema, Stream } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { conformance } from "./conformance.test.support.ts";
import { effect2rs } from "./index.ts";

const RUSTFMT_TIMEOUT = 60_000;
const RUSTFMT = ["--edition", "2024", "--emit", "stdout", "--quiet"];

const rustfmt = Effect.fn("rustfmt")(function* rustfmt(source: string) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const stdin = Stream.succeed(new TextEncoder().encode(source));
  return yield* spawner.string(ChildProcess.make("rustfmt", RUSTFMT, { stdin }));
});

const Short = Schema.Union([
  Schema.TaggedStruct("Unit", {}),
  Schema.TaggedStruct("Point", { x: Schema.Finite, y: Schema.Finite }),
]).annotate({ identifier: "Short" });

const Forced = Schema.Union([
  Schema.TaggedStruct("Point", { x: Schema.Finite }),
  Schema.TaggedStruct("Wide", {
    aVeryLongFieldName: Schema.String,
    anotherLongFieldName: Schema.String,
  }),
]).annotate({ identifier: "Forced" });

const Attributed = Schema.Union([
  Schema.TaggedStruct("self", {}),
  Schema.TaggedStruct("Self", { note: Schema.String }),
]).annotate({ identifier: "Attributed" });

const Documented = Schema.Union([
  Schema.TaggedStruct("Plain", { x: Schema.Finite }),
  Schema.TaggedStruct("Noted", {
    x: Schema.Finite.annotate({ description: "A coordinate.\nSecond line." }),
  }).annotate({ description: "A noted variant." }),
]).annotate({ identifier: "Documented", description: "Variants with docs." });

const Widened = Schema.Union([
  Schema.TaggedStruct("At", { at: Schema.Int }),
  Schema.TaggedStruct("Free", { value: Schema.Unknown }),
]).annotate({ identifier: "Widened" });

const Exactly = Schema.Union([
  Schema.TaggedStruct("Fits", { aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa: Schema.Boolean }),
  Schema.TaggedStruct("Overflows", { aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa: Schema.Boolean }),
  Schema.TaggedStruct("Empty", {}),
]).annotate({ identifier: "Exactly" });

const cases = {
  conformance,
  short: { Short },
  forced: { Forced },
  attributed: { Attributed },
  documented: { Documented },
  widened: { Widened },
  exactly: { Exactly },
};

layer(NodeServices.layer)("rustfmt", (it) => {
  it.effect.each(Record.toEntries(cases))(
    "%s is already formatted the way rustfmt formats it",
    ([, definitions]) =>
      Effect.gen(function* body() {
        const plain = yield* effect2rs({ header: "// test", definitions });
        const specta = yield* effect2rs({
          header: "// test",
          derive: ["specta::Type", "schemars::JsonSchema"],
          definitions,
        });
        const formattedPlain = yield* rustfmt(plain);
        const formattedSpecta = yield* rustfmt(specta);
        expect(formattedPlain).toBe(plain);
        expect(formattedSpecta).toBe(specta);
      }),
    RUSTFMT_TIMEOUT,
  );
});
