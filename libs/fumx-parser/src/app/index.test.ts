import { expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Option, pipe } from "effect";

import { fractionOf, readSong } from "./index.ts";

const HIGHEST_G5 = 79;

const SONG = `song "lint me"

instrument lead sample "lead.flac" root C4

track lead instrument lead

bar meter 4/4 tempo 120bpm {
  lead: C4 1/4, E4 1/4, B5 1/2 vel 0.9
  lead.cc 64: 127 1/2, 0 1/2
}
`;

const read = (text: string): ReturnType<typeof readSong<never>> =>
  readSong({ path: "/song.fumx", read: () => Effect.succeed(text) });

it.effect("reads notes and controllers placed in time", () =>
  Effect.gen(function* placed() {
    const source = yield* read(SONG);
    if (source.status === "invalid") {
      expect.unreachable();
    }
    expect(
      pipe(
        source.song.notes,
        Arr.map((note) => `${String(note.midi)} at ${fractionOf(note.start)}`),
      ),
    ).toStrictEqual(["60 at 0", "64 at 1/4", "83 at 1/2"]);
    expect(
      pipe(
        source.song.controls,
        Arr.map((control) => `${control.controller.kind} ${String(control.value)}`),
      ),
    ).toStrictEqual(["cc 127", "cc 0"]);
  }),
);

it.effect("lets a lint rule find a note above a range", () =>
  Effect.gen(function* rule() {
    const source = yield* read(SONG);
    if (source.status === "invalid") {
      expect.unreachable();
    }
    const tooHigh = pipe(
      source.song.notes,
      Arr.filter((note) => note.midi > HIGHEST_G5),
      Arr.head,
      Option.map((note) => fractionOf(note.start)),
    );
    expect(tooHigh).toStrictEqual(Option.some("1/2"));
  }),
);

it.effect("reports where the text cannot be read", () =>
  Effect.gen(function* invalid() {
    const source = yield* read(`${SONG}bar {\n  lead: C4 1/2\n}\n`);
    expect(source.status).toBe("invalid");
    if (source.status === "valid") {
      expect.unreachable();
    }
    expect(
      pipe(
        source.issues,
        Arr.map((issue) => `${String(issue.line)}: ${issue.message}`),
      ),
    ).toStrictEqual(["12: lead の合計は 1/2 で、この小節の 1/1 に 1/2 足りません"]);
  }),
);
