import { expect, it } from "@effect/vitest";
import { Effect, Exit, Option, Schema } from "effect";

import type { HandWrittenCopies, StaleRust, UnsupportedSchema, RustFile } from "./index.ts";
import { checkRust, effect2rs } from "./index.ts";

const HEADER = "// @generated";
const PATH = "src/protocol.rs";
const MODEL_LINE = 3;
const FIRST_LINE = 1;
const SECOND_LINE = 2;
const Note = Schema.Struct({ text: Schema.String }).annotate({ identifier: "Note" });
const input = { header: HEADER, definitions: { NOTE_ORIGIN: "https://example.test", Note } };

const check = (
  current: Option.Option<string>,
  siblings: readonly RustFile[],
): Effect.Effect<void, StaleRust | HandWrittenCopies | UnsupportedSchema> =>
  checkRust({ ...input, path: PATH, current, siblings });

it.effect("a fresh output with unrelated Rust beside it passes", () =>
  Effect.gen(function* body() {
    const source = yield* effect2rs(input);
    const lib = {
      path: "src/lib.rs",
      source: "pub mod protocol;\npub struct Other;\npub const fn note() -> u8 { 1 }\n",
    };
    const result = yield* Effect.exit(check(Option.some(source), [lib]));
    expect(Exit.isSuccess(result)).toBe(true);
  }),
);

it.effect("a missing output is stale", () =>
  Effect.gen(function* body() {
    const failure = yield* Effect.flip(check(Option.none(), []));
    expect(failure).toMatchObject({ _tag: "StaleRust", path: PATH });
    expect(failure.message).toBe(
      `${PATH} does not match the Effect Schema. Generate it again with effect2rs.`,
    );
  }),
);

it.effect("an edited output is stale", () =>
  Effect.gen(function* body() {
    const failure = yield* Effect.flip(check(Option.some("// edited\n"), []));
    expect(failure).toMatchObject({ _tag: "StaleRust", path: PATH });
  }),
);

it.effect("hand-written copies of generated items are reported with their lines", () =>
  Effect.gen(function* body() {
    const source = yield* effect2rs(input);
    const model = {
      path: "src/model.rs",
      source: "use serde::Serialize;\n\npub struct Note {\n}\n",
    };
    const state = {
      path: "src/sync/state.rs",
      source: 'pub(crate) const NOTE_ORIGIN: &str = "x";\n  enum Note {}\n',
    };
    const failure = yield* Effect.flip(check(Option.some(source), [model, state]));
    expect(failure).toMatchObject({
      _tag: "HandWrittenCopies",
      copies: [
        { path: model.path, line: MODEL_LINE, name: "Note" },
        { path: state.path, line: FIRST_LINE, name: "NOTE_ORIGIN" },
        { path: state.path, line: SECOND_LINE, name: "Note" },
      ],
    });
    expect(failure.message).toContain(`${model.path}:${MODEL_LINE} declares Note`);
  }),
);

it.effect("names that only appear in use, impl, or fn are not copies", () =>
  Effect.gen(function* body() {
    const source = yield* effect2rs(input);
    const uses = {
      path: "src/notes.rs",
      source:
        "use crate::protocol::Note;\nimpl Note {}\nfn note(note: &Note) -> &str { &note.text }\n",
    };
    const result = yield* Effect.exit(check(Option.some(source), [uses]));
    expect(Exit.isSuccess(result)).toBe(true);
  }),
);
