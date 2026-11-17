# @masseater.dev/song-format

This workspace defines the song file format `.fumx`. `.fumx` is a typed general-purpose language and will also be the save format of a future DAW. TypeScript reads a compiled song as a value with `import { song } from "./song.fumx"`.

The grammar and the reader that turns `.fumx` into a song value live in the published library `@r_masseater/fumx-parser` (libs/fumx-parser). This workspace builds TypeScript imports, the language server, analysis and MIDI conversion on top of it.

`song-report <file>` prints, as JSON, the keys, chords and repeated bars derived from a song file. An AI that cannot listen to the song reads this output to check what it wrote.

`midi-to-fumx <file>` converts a Standard MIDI File to `.fumx`. It reads the written `.fumx` back, compares it with the events of the original MIDI, and fails if even one differs.
