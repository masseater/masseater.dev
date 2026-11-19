# @r_masseater/fumx-parser

Reads `.fumx`, a text format for music, into a typed song value. Notes, drum hits, controllers and tempo come out placed in time, so a program can check musical rules against them.

MIDI and DAW projects are binary. A linter cannot read them the way it reads code, so the habits and rules a composer keeps, such as a range a part must stay in or a voicing they avoid, stay in their head. `.fumx` writes a song as text, one bar after another, with the notes, velocities, controllers, tempo and meter changes, lyrics and markers a MIDI file carries. This package turns that text into data, which makes those habits checkable rules.

## Usage

```sh
vp add @r_masseater/fumx-parser effect
```

```ts
import { readSong } from "@r_masseater/fumx-parser";
import { Effect } from "effect";

const text = `song "lint me"

instrument lead sample "lead.flac" root C4

track lead instrument lead

bar meter 4/4 tempo 120bpm {
  lead: C4 1/4, E4 1/4, B5 1/2 vel 0.9
  lead.cc 64: 127 1/2, 0 1/2
}
`;

const source = await Effect.runPromise(
  readSong({ path: "/song.fumx", read: () => Effect.succeed(text) }),
);
if (source.status === "valid") {
  const tooHigh = source.song.notes.filter((note) => note.midi > 79);
}
```

`readSong` follows `import` statements through `read`, so the files can come from disk, memory or a network. An invalid file gives `issues` with a path, line and column. The messages are in Japanese. `outline.comments` lists the `//` and `/* */` comments of the entry file with their line and column, so tools such as linters can read directives from them.

Times are integer ticks, `TICKS_PER_WHOLE` to a whole note; `fractionOf` prints them as `1/4`. `@r_masseater/fumx-parser/analysis` estimates what the notes imply but the file does not write: the key of a range of bars (`keyIn`), the chord on each beat (`chordsOf`) and bars that repeat. `analyze` returns all of them for a song, and `soundingsOf` lists the notes of unmuted tracks with their track role and source line.

`@r_masseater/fumx-parser/language` exports the Langium grammar and modules for editors and language servers.

## Agent skills

The package ships TanStack Intent skills for coding agents. Load one with `vp exec intent load @r_masseater/fumx-parser#<skill>`.
