# @masseater.dev/song-format

This workspace defines the song file format `.fumx`. `.fumx` is a typed general-purpose language and will also be the save format of a future DAW. TypeScript reads a compiled song as a value with `import { song } from "./song.fumx"`.

The grammar and the reader that turns `.fumx` into a song value live in the published library `@r_masseater/fumx-parser` (libs/fumx-parser). This workspace builds TypeScript imports, the language server, the song report and MIDI conversion on top of it. Key, chord and repeat analysis lives in `@r_masseater/fumx-parser/analysis`.

`song-report <file>` prints, as JSON, the keys, chords and repeated bars derived from a song file. An AI that cannot listen to the song reads this output to check what it wrote.

`midi-to-fumx <file>` converts a Standard MIDI File to `.fumx`. It reads the written `.fumx` back, compares it with the events of the original MIDI, and fails if even one differs.

`als-to-fumx <file>` converts the arrangement of an Ableton Live Set (Live 8 to 12) to `.fumx`: MIDI clips with their loops and start markers, tempo automation with ramps, time signatures and locators. Session clips, audio clips, devices and mixer settings are not converted yet. It reads the written `.fumx` back and fails if a note, tempo change or locator differs.

The `als-to-fumx` fixtures in `src/features/convert-als/model/fixtures/` come from [als-parser](https://github.com/live-daw-tools/als-parser) at `94fe482d66e9492f840fc59cc95f9a82a8c2ab35` (MIT; `live11-template.als` is its `Test Project.als`, with empty tracks the tests fill) and [dawtool](https://github.com/offlinemark/dawtool) at `44f3e19ffc686477051e2d8a9049a838018d6256` (BSD 3-Clause), each with its `LICENSE`. None of them holds music.

`dawtool/cases.json` lists what each test in dawtool's `tests/test_ableton.py` expects: the file, `theoretical`, the tempo points `[beat, bpm]`, the markers `[seconds, name]` and `unreadable`.
