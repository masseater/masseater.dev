---
name: read-fumx
description: >
  Use when code must read a .fumx song into data with @r_masseater/fumx-parser: readSong and its read
  callback, the valid and invalid results, the Song value's notes, hits, controls and bars, ticks and
  fractionOf, and writing a lint rule over the result.
metadata:
  type: core
  library: "@r_masseater/fumx-parser"
  library_version: 0.2.0
sources:
  - src/app/**
  - src/entities/song/**
  - src/features/read-song/model/read-song.ts
  - src/features/analyze-song/**
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

Report a finding with the note's `sourceLine` and `sourceColumn`, the position of the note in the file. `line` is the index of the voice line inside its bar, not a file line.

## Keys and chords

The file does not write keys or chords. `@r_masseater/fumx-parser/analysis` estimates them from the notes:

```ts
import { analyze, keyIn, soundingsOf } from "@r_masseater/fumx-parser/analysis";

const report = analyze(song);
const verseKey = keyIn(song)({ fromBar: 1, toBar: 8 });
const heard = soundingsOf(song);
```

`analyze` returns the key of the whole song, the key of every four bars, the chord on each beat and bars that repeat. `soundingsOf` lists the notes of unmuted tracks with their track `role`, source `line` and `column`, and an `end` that the note's `gate` shortens. For ready-made rules, use `@r_masseater/i68` and `@r_masseater/i68-presets`.
