---
name: read-fumx
description: >
  Use when code must read a .fumx song into data with @r_masseater/fumx-parser: readSong and its read
  callback, the valid and invalid results, the Song value's notes, hits, controls and bars, ticks and
  fractionOf, and writing a lint rule over the result.
metadata:
  type: core
  library: "@r_masseater/fumx-parser"
  library_version: 0.1.0
sources:
  - src/app/**
  - src/entities/song/**
  - src/features/read-song/model/read-song.ts
  - README.md
---

# read-fumx

`readSong` turns `.fumx` text into a `Song`. Every note, hit and controller event has a track, a bar and an absolute `start` and `length` in ticks, so a rule about music is a filter over plain data.

## Read a song

```ts
import { readSong } from "@r_masseater/fumx-parser";
import { Effect, FileSystem } from "effect";

const program = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem;
  return yield* readSong({
    path: "/songs/demo.fumx",
    read: (path) => fileSystem.readFileString(path),
  });
});
```

`read` is called for the entry file and for every file it imports. Its error type flows into the result.

`source.status` is `"valid"` with `song`, or `"invalid"` with `issues` (`path`, `line`, `column`, `start`, `end`, `message`). Both carry an `outline` of where names are declared. Messages are in Japanese.

## The song value

| Field                           | Holds                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| `notes`                         | Pitched notes: `midi`, `velocity` (0 to 1), `releaseVelocity`, `gate`, `lyric`, `bend`        |
| `hits`                          | Drum hits: kit `voice`, `velocity`, `releaseVelocity`                                         |
| `controls`                      | Controller events: `controller.kind` is `cc` (with `number`), `pressure`, `bend` or `program` |
| `bars`                          | Each bar's `start`, `length`, `meter`, `tempo`, `tempoSteps`, `section` and `mark`            |
| `tracks`, `instruments`, `kits` | The declarations in the header                                                                |

Ties are already joined: a note tied over a bar line is one note.

Times are ticks. `TICKS_PER_WHOLE` ticks make a whole note, and `fractionOf(ticks)` prints `"3/8"`. Compare with ticks, not with fractions.

## Write a rule

```ts
import type { Song } from "@r_masseater/fumx-parser";

declare const song: Song;

const outOfRange = song.notes.filter(
  (note) => note.track === "bass" && (note.midi < 28 || note.midi > 55),
);
```

Report a finding with the note's `bar` and `start`. Keys and chords are not stored; derive them from the notes.
