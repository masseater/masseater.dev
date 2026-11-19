# @r_masseater/i68

A linter for `.fumx` songs, configured from `vite.config.ts`.

`.fumx` writes music as text, so the habits a composer keeps can be checked like code: notes outside the key, a part above what its singer can reach, two parts clashing a semitone apart. i68 reads each song with [`@r_masseater/fumx-parser`](https://www.npmjs.com/package/@r_masseater/fumx-parser), runs rules written in TypeScript over its notes, and prints each finding with its file, line and column.

```sh
vp add -D @r_masseater/i68 @r_masseater/i68-presets effect
```

```ts
import "@r_masseater/i68/vite";
import { recommended } from "@r_masseater/i68-presets";
import { defineConfig } from "vite-plus";

export default defineConfig({
  i68: {
    extends: [recommended({ ranges: { lead: ["A3", "E5"] } })],
    rules: { "harmony/chord-above-melody": "off" },
  },
});
```

```sh
vp exec i68            # every .fumx file git tracks
vp exec i68 songs/     # only these paths
```

The official rules live in [`@r_masseater/i68-presets`](https://www.npmjs.com/package/@r_masseater/i68-presets), one preset per concern.

## Rules

A rule gets the song, the notes that sound (with their track role, source line and column) and its options, and reports what it finds.

```ts
import { definePlugin, defineRule } from "@r_masseater/i68";

const noHighBass = defineRule({
  meta: { description: "The bass stays at or below C3" },
  check: (context) => {
    for (const note of context.soundings) {
      if (note.track === "bass" && note.midi > 48) {
        context.report({ line: note.line, column: note.column, message: "The bass is too high" });
      }
    }
  },
});

export const local = definePlugin({ rules: { "no-high-bass": noHighBass } });
```

Register a plugin under a name in `plugins` and its rules become `<name>/<rule>`. A rule is on as an error unless `rules` sets it to `"warn"`, `"off"` or `["warn", { ...options }]`. A later config that sets only the severity keeps the options an earlier one gave, as in ESLint. Naming a plugin or a rule that is not registered, or a rule that throws, stops the run with an error.

## Ignoring a finding

When a passage breaks a rule on purpose, say so in the file, and write why after `--`:

```fumx
lead: C5 1/2, F#5 1/2  // i68-ignore pop/out-of-key -- borrowed from the parallel minor
// i68-ignore-next-line harmony/semitone-clash
pad: [B4 C5] 1/1
// i68-disable pop/melody-leap -- the chorus jumps on purpose
...
// i68-enable pop/melody-leap
// i68-ignore-file classical/parallel-perfects
```

Directives follow ESLint's: they start the comment, `//` or `/* */`, and separate rule names with commas. `i68-ignore` covers its own line, `i68-ignore-next-line` the line after it, and `i68-ignore-file` the whole file. `i68-disable` covers everything after it until the matching `i68-enable`, or to the end of the file. A comment without rule names covers every rule.

## Programmatic use

`lint({ root, files, read, config })` lints files through your own `read`. `lintText({ path, text, config })` lints one song held in memory, for editors and tests. Both return diagnostics with `path`, `line`, `column`, `rule`, `severity`, `message` and `detail`.

## Agent skills

The package ships TanStack Intent skills for coding agents. Load one with `vp exec intent load @r_masseater/i68#<skill>`.
